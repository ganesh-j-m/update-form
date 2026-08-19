/**
 * Career Katta — Multi-Form Response Dashboard backend
 * -----------------------------------------------------
 * Supports MANY independent forms (Student Registration, Principal
 * Registration, Coordinator Registration, College Response, ...),
 * each with:
 *   - its own set of fields (built in the dashboard's Form Builder)
 *   - its own shareable public URL  (/form.html?form=<slug>)
 *   - its own live response table + shortlist on the dashboard
 *
 * Storage: flat JSON files under /data.
 *   data/forms.json      -> array of form definitions
 *   data/responses.json  -> array of ALL responses, each tagged with formId
 * That's enough for college-outreach-scale data. Swap readJSON/writeJSON
 * for a real DB later — nothing else changes.
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Very light admin protection for write/delete endpoints.
// Change this before you put the app on a real server.
const ADMIN_KEY = process.env.ADMIN_KEY || 'career-katta-admin';

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
// If DATA_DIR points to a fresh Render Persistent Disk mount (e.g. /var/data),
// make sure the folder exists, and seed it once from the bundled sample data
// (the 28 existing College Responses) so the first deploy isn't empty.
const BUNDLED_DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (DATA_DIR !== BUNDLED_DATA_DIR) {
  ['forms.json', 'responses.json'].forEach((file) => {
    const dest = path.join(DATA_DIR, file);
    const src = path.join(BUNDLED_DATA_DIR, file);
    if (!fs.existsSync(dest) && fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  });
}
const FORMS_FILE = path.join(DATA_DIR, 'forms.json');
const RESPONSES_FILE = path.join(DATA_DIR, 'responses.json');
const LEGACY_FORM_CONFIG_FILE = path.join(DATA_DIR, 'form-config.json');

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------- banner / flyer uploads
// Each form can have one banner/flyer image, shown at the top of its public page.
// Stored on disk under public/uploads/banners so it's servable as a plain static file.
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads', 'banners');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }[file.mimetype] || '';
      cb(null, `${req.params.id}-${Date.now()}${ext}`);
    }
  }),
  limits: { fileSize: 4 * 1024 * 1024 }, // 4MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) return cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed.'));
    cb(null, true);
  }
});

// ---------------------------------------------------------------- helpers

function readJSON(file, fallback) {
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function requireAdmin(req, res, next) {
  const key = req.header('x-admin-key');
  if (key && key === ADMIN_KEY) return next();
  return res.status(401).json({ error: 'Unauthorized. Missing or invalid x-admin-key header.' });
}

function slugify(label) {
  return (label || 'form').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'form';
}

function uniqueSlug(base, forms, ignoreId) {
  let slug = base, n = 2;
  const taken = (s) => forms.some((f) => f.slug === s && f.id !== ignoreId);
  while (taken(slug)) slug = `${base}-${n++}`;
  return slug;
}

function nextSr(responses, formId) {
  return responses.filter((r) => r.formId === formId).reduce((max, r) => Math.max(max, r.sr || 0), 0) + 1;
}

function findForm(forms, idOrSlug) {
  return forms.find((f) => f.id === idOrSlug || f.slug === idOrSlug);
}

// ---------------------------------------------------------------- one-time migration
// If this project was set up before multi-form support existed, it only had
// data/form-config.json (single form) + data/responses.json (flat, no formId).
// On first boot with the new code, fold that single form into forms.json as
// the first entry and stamp every existing response with its formId.
(function migrateLegacyDataIfNeeded() {
  if (fs.existsSync(FORMS_FILE)) return; // already migrated / already multi-form
  const legacy = readJSON(LEGACY_FORM_CONFIG_FILE, null);
  if (!legacy) {
    writeJSON(FORMS_FILE, []);
    return;
  }
  // Reuse a formId already stamped on responses.json from a prior partial
  // migration, if present, so we never orphan existing responses.
  const existingResponses = readJSON(RESPONSES_FILE, []);
  const alreadyStamped = existingResponses.find((r) => r.formId);
  const id = (alreadyStamped && alreadyStamped.formId) || crypto.randomUUID();
  const migratedForm = {
    id,
    slug: 'college-responses',
    formTitle: legacy.formTitle || 'College Response Form',
    formTitleMr: legacy.formTitleMr || '',
    formDescription: legacy.formDescription || '',
    formDescriptionMr: legacy.formDescriptionMr || '',
    uniqueField: legacy.uniqueField || (legacy.fields && legacy.fields[0] && legacy.fields[0].key) || '',
    fields: legacy.fields || [],
    createdAt: legacy.updatedAt || new Date().toISOString(),
    updatedAt: legacy.updatedAt || new Date().toISOString()
  };
  writeJSON(FORMS_FILE, [migratedForm]);

  const responses = readJSON(RESPONSES_FILE, []);
  const stamped = responses.map((r) => (r.formId ? r : { ...r, formId: id }));
  writeJSON(RESPONSES_FILE, stamped);
})();

// ---------------------------------------------------------------- forms

// Public: list every form (student registration, principal registration, ...)
// so the dashboard can render the "Forms" switcher and the public link picker.
app.get('/api/forms', (req, res) => {
  const forms = readJSON(FORMS_FILE, []);
  const responses = readJSON(RESPONSES_FILE, []);
  const withCounts = forms.map((f) => ({
    ...f,
    responseCount: responses.filter((r) => r.formId === f.id).length
  }));
  res.json({ forms: withCounts });
});

// Public: get a single form's config, looked up by id OR slug — this is what
// both the public form page and the dashboard (once a form is selected) load.
app.get('/api/forms/:idOrSlug', (req, res) => {
  const forms = readJSON(FORMS_FILE, []);
  const form = findForm(forms, req.params.idOrSlug);
  if (!form) return res.status(404).json({ error: 'Form not found.' });
  res.json(form);
});

// Admin: create a brand-new form (e.g. "Student Registration"). Gets its own
// id, slug, and therefore its own shareable URL + its own shortlist table.
app.post('/api/forms', requireAdmin, (req, res) => {
  const { formTitle, formTitleMr, formDescription, formDescriptionMr, uniqueField, fields, slug } = req.body || {};

  if (!formTitle || !String(formTitle).trim()) {
    return res.status(400).json({ error: 'formTitle is required.' });
  }
  if (!Array.isArray(fields) || fields.length === 0) {
    return res.status(400).json({ error: 'At least one field is required.' });
  }
  for (const f of fields) {
    if (!f.key || !f.label || !f.type) {
      return res.status(400).json({ error: 'Every field needs a key, label and type.' });
    }
  }
  const keys = fields.map((f) => f.key);
  if (new Set(keys).size !== keys.length) {
    return res.status(400).json({ error: 'Field keys must be unique.' });
  }

  const forms = readJSON(FORMS_FILE, []);
  const now = new Date().toISOString();
  const form = {
    id: crypto.randomUUID(),
    slug: uniqueSlug(slugify(slug || formTitle), forms),
    formTitle: String(formTitle).trim(),
    formTitleMr: formTitleMr || '',
    formDescription: formDescription || '',
    formDescriptionMr: formDescriptionMr || '',
    uniqueField: uniqueField && keys.includes(uniqueField) ? uniqueField : keys[0],
    fields,
    createdAt: now,
    updatedAt: now
  };
  forms.push(form);
  writeJSON(FORMS_FILE, forms);
  res.status(201).json(form);
});

// Admin: edit an existing form (add/remove/edit fields, retitle, etc).
// id and slug stay put, so the shared link keeps working after an edit.
app.put('/api/forms/:id', requireAdmin, (req, res) => {
  const forms = readJSON(FORMS_FILE, []);
  const idx = forms.findIndex((f) => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Form not found.' });

  const { formTitle, formTitleMr, formDescription, formDescriptionMr, uniqueField, fields } = req.body || {};
  if (!Array.isArray(fields) || fields.length === 0) {
    return res.status(400).json({ error: 'At least one field is required.' });
  }
  for (const f of fields) {
    if (!f.key || !f.label || !f.type) {
      return res.status(400).json({ error: 'Every field needs a key, label and type.' });
    }
  }
  const keys = fields.map((f) => f.key);
  if (new Set(keys).size !== keys.length) {
    return res.status(400).json({ error: 'Field keys must be unique.' });
  }

  const existing = forms[idx];
  const updated = {
    ...existing,
    formTitle: formTitle || existing.formTitle,
    formTitleMr: formTitleMr !== undefined ? formTitleMr : existing.formTitleMr,
    formDescription: formDescription !== undefined ? formDescription : existing.formDescription,
    formDescriptionMr: formDescriptionMr !== undefined ? formDescriptionMr : existing.formDescriptionMr,
    uniqueField: uniqueField && keys.includes(uniqueField) ? uniqueField : keys[0],
    fields,
    updatedAt: new Date().toISOString()
  };
  forms[idx] = updated;
  writeJSON(FORMS_FILE, forms);
  res.json(updated);
});

// Admin: delete a form entirely, along with all of its collected responses.
app.delete('/api/forms/:id', requireAdmin, (req, res) => {
  const forms = readJSON(FORMS_FILE, []);
  const idx = forms.findIndex((f) => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Form not found.' });
  const [removed] = forms.splice(idx, 1);
  writeJSON(FORMS_FILE, forms);

  if (removed.bannerUrl) {
    const bannerPath = path.join(__dirname, 'public', removed.bannerUrl.replace(/^\//, ''));
    if (fs.existsSync(bannerPath)) fs.unlink(bannerPath, () => {});
  }

  let responses = readJSON(RESPONSES_FILE, []);
  responses = responses.filter((r) => r.formId !== removed.id);
  writeJSON(RESPONSES_FILE, responses);

  res.json({ ok: true });
});

// ---------------------------------------------------------------- banner / flyer (per form)

// Admin: upload/replace a form's banner-flyer image. Field name in the
// multipart form must be "banner". Old file (if any) is removed.
app.post('/api/forms/:id/banner', requireAdmin, (req, res) => {
  upload.single('banner')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Upload failed.' });

    const forms = readJSON(FORMS_FILE, []);
    const idx = forms.findIndex((f) => f.id === req.params.id);
    if (idx === -1) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Form not found.' });
    }
    if (!req.file) return res.status(400).json({ error: 'No image file received (field name must be "banner").' });

    // Remove the previous banner file from disk, if any, before pointing to the new one.
    const prevUrl = forms[idx].bannerUrl;
    if (prevUrl) {
      const prevPath = path.join(__dirname, 'public', prevUrl.replace(/^\//, ''));
      if (fs.existsSync(prevPath)) fs.unlink(prevPath, () => {});
    }

    forms[idx].bannerUrl = `/uploads/banners/${req.file.filename}`;
    forms[idx].updatedAt = new Date().toISOString();
    writeJSON(FORMS_FILE, forms);
    res.json(forms[idx]);
  });
});

// Admin: remove a form's banner/flyer image.
app.delete('/api/forms/:id/banner', requireAdmin, (req, res) => {
  const forms = readJSON(FORMS_FILE, []);
  const idx = forms.findIndex((f) => f.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Form not found.' });

  const prevUrl = forms[idx].bannerUrl;
  if (prevUrl) {
    const prevPath = path.join(__dirname, 'public', prevUrl.replace(/^\//, ''));
    if (fs.existsSync(prevPath)) fs.unlink(prevPath, () => {});
  }
  delete forms[idx].bannerUrl;
  forms[idx].updatedAt = new Date().toISOString();
  writeJSON(FORMS_FILE, forms);
  res.json(forms[idx]);
});

// ---------------------------------------------------------------- responses (scoped per form)

// Dashboard polls this (live data) for whichever form is currently selected.
app.get('/api/forms/:id/responses', (req, res) => {
  const forms = readJSON(FORMS_FILE, []);
  const form = findForm(forms, req.params.id);
  if (!form) return res.status(404).json({ error: 'Form not found.' });
  const responses = readJSON(RESPONSES_FILE, []).filter((r) => r.formId === form.id);
  res.json({ count: responses.length, responses });
});

// Public: anyone with THIS form's link submits here. No admin key needed —
// this is what makes each shared form URL work for outside respondents.
app.post('/api/forms/:id/responses', (req, res) => {
  const forms = readJSON(FORMS_FILE, []);
  const form = findForm(forms, req.params.id);
  if (!form) return res.status(404).json({ error: 'Form not found.' });

  const { values } = req.body || {};
  if (!values || typeof values !== 'object') {
    return res.status(400).json({ error: 'values object is required.' });
  }

  const missing = form.fields.filter((f) => f.required && !String(values[f.key] || '').trim());
  if (missing.length) {
    return res.status(400).json({
      error: 'Missing required fields.',
      fields: missing.map((f) => f.label)
    });
  }

  const cleanValues = {};
  form.fields.forEach((f) => {
    cleanValues[f.key] = values[f.key] !== undefined ? String(values[f.key]).trim() : '';
  });

  const responses = readJSON(RESPONSES_FILE, []);
  const record = {
    id: crypto.randomUUID(),
    formId: form.id,
    sr: nextSr(responses, form.id),
    submittedAt: new Date().toISOString(),
    source: 'form',
    values: cleanValues
  };
  responses.push(record);
  writeJSON(RESPONSES_FILE, responses);

  res.status(201).json({ ok: true, record });
});

// Admin: manually add a response straight from the dashboard (e.g. a phone-in response).
app.post('/api/forms/:id/responses/manual', requireAdmin, (req, res) => {
  req.url = `/api/forms/${req.params.id}/responses`;
  app._router.handle(req, res);
});

// Admin: delete a single response row.
app.delete('/api/forms/:id/responses/:responseId', requireAdmin, (req, res) => {
  const responses = readJSON(RESPONSES_FILE, []);
  const idx = responses.findIndex((r) => r.id === req.params.responseId && r.formId === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Response not found.' });
  responses.splice(idx, 1);
  writeJSON(RESPONSES_FILE, responses);
  res.json({ ok: true });
});

// Admin: bulk delete (e.g. clearing a shortlist or wiping demo data) — scoped to one form.
app.post('/api/forms/:id/responses/bulk-delete', requireAdmin, (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array required.' });
  let responses = readJSON(RESPONSES_FILE, []);
  const idSet = new Set(ids);
  const before = responses.length;
  responses = responses.filter((r) => !(r.formId === req.params.id && idSet.has(r.id)));
  writeJSON(RESPONSES_FILE, responses);
  res.json({ ok: true, deleted: before - responses.length });
});

// ---------------------------------------------------------------- misc

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Friendly root -> dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard.html');
});

app.listen(PORT, () => {
  console.log(`Career Katta server running: http://localhost:${PORT}`);
  console.log(`  Admin dashboard : http://localhost:${PORT}/dashboard.html`);
  console.log(`  Public form     : http://localhost:${PORT}/form.html?form=<slug>`);
  console.log(`  Admin key       : ${ADMIN_KEY} (set ADMIN_KEY env var to change it)`);
});
