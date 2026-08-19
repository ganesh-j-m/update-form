/* Career Katta — dashboard.js
 * Renders the Forms switcher (Student Registration, Principal Registration,
 * Coordinator Registration, ...), then for whichever form is selected: a
 * fully dynamic table/filter bar driven by that form's config, polling for
 * live updates, plus the form builder (create/edit/delete fields), manual
 * add, delete, and xlsx export — all scoped to the selected form.
 */

const API = {
  forms: '/api/forms',
  formById: (id) => `/api/forms/${id}`,
  responses: (formId) => `/api/forms/${formId}/responses`,
  responseById: (formId, id) => `/api/forms/${formId}/responses/${id}`,
  manual: (formId) => `/api/forms/${formId}/responses/manual`,
  bulkDelete: (formId) => `/api/forms/${formId}/responses/bulk-delete`,
  banner: (formId) => `/api/forms/${formId}/banner`
};

const POLL_MS = 6000;

let allForms = [];             // list of all forms (with responseCount) for the switcher
let currentFormId = null;      // id of the currently selected form
let formConfig = null;         // full config of the currently selected form
let allResponses = [];
let currentRows = [];
let shortlist = new Set();     // keyed by uniqueField value (falls back to id) — per selected form
let mode = 'new';
let knownIds = new Set();      // to detect + flash newly arrived rows
let pollTimer = null;
let builderContext = 'create'; // 'create' | 'edit' — which mode the form-builder modal is in

// ------------------------------------------------------------------ DOM
const tableWrap = document.getElementById('tableWrap');
const shortlistStatValue = document.getElementById('shortlistStatValue');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toastText');
const dynamicFilters = document.getElementById('dynamicFilters');
const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
const formsGrid = document.getElementById('formsGrid');
const formsPanelSub = document.getElementById('formsPanelSub');
const selectedFormPanel = document.getElementById('selectedFormPanel');

function showToast(msg) {
  toastText.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}

function uniqueKeyOf(record) {
  const key = formConfig?.uniqueField;
  const v = key && record.values[key];
  return v || record.id;
}

function getFormUrl(form) {
  const f = form || formConfig;
  if (!f) return '';
  return `${window.location.origin}/form.html?form=${encodeURIComponent(f.slug)}`;
}

// ------------------------------------------------------------------ admin key
// Uses an in-page modal instead of window.prompt(), since some embedded/in-app
// browsers (e.g. VS Code's Simple Browser) block the native prompt() dialog.
function askAdminKeyModal() {
  return new Promise((resolve) => {
    const backdrop = document.getElementById('adminKeyBackdrop');
    const input = document.getElementById('adminKeyInput');
    input.value = '';
    backdrop.classList.add('show');
    setTimeout(() => input.focus(), 50);

    function cleanup(result) {
      backdrop.classList.remove('show');
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      closeBtn.removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onKeydown);
      resolve(result);
    }
    function onConfirm() { cleanup(input.value.trim() || null); }
    function onCancel() { cleanup(null); }
    function onKeydown(e) { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') onCancel(); }

    const confirmBtn = document.getElementById('confirmAdminKeyBtn');
    const cancelBtn = document.getElementById('cancelAdminKeyBtn');
    const closeBtn = document.getElementById('closeAdminKeyBtn');
    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    closeBtn.addEventListener('click', onCancel);
    input.addEventListener('keydown', onKeydown);
  });
}

async function getAdminKey() {
  let key = localStorage.getItem('ck_admin_key');
  if (!key) {
    key = await askAdminKeyModal();
    if (key) localStorage.setItem('ck_admin_key', key);
  }
  return key;
}

async function adminFetch(url, options = {}) {
  const key = await getAdminKey();
  if (!key) throw new Error('Admin key required.');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = { ...(options.headers || {}), 'x-admin-key': key };
  if (!isFormData) headers['Content-Type'] = 'application/json';
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('ck_admin_key');
    throw new Error('Admin key was rejected. Please try again.');
  }
  return res;
}

// ------------------------------------------------------------------ forms switcher
async function loadForms() {
  const res = await fetch(API.forms);
  const data = await res.json();
  allForms = data.forms || [];
  renderFormsGrid();

  // Keep dashboard subtitle in sync
  formsPanelSub.textContent = allForms.length
    ? `${allForms.length} form${allForms.length > 1 ? 's' : ''} created — click one to view its live responses.`
    : 'No forms yet — click "+ New Form" to create your first one (e.g. Student Registration).';

  // Auto-select the first form if nothing is selected yet, or re-sync counts
  // for the currently selected one.
  if (!currentFormId && allForms.length) {
    await selectForm(allForms[0].id);
  } else if (currentFormId) {
    const stillExists = allForms.some((f) => f.id === currentFormId);
    if (!stillExists) {
      currentFormId = null;
      formConfig = null;
      selectedFormPanel.style.display = 'none';
      if (allForms.length) await selectForm(allForms[0].id);
    }
  }
}

function renderFormsGrid() {
  formsGrid.innerHTML = '';
  if (!allForms.length) {
    formsGrid.innerHTML = `<div class="form-card-empty">No forms yet. Click <b>+ New Form</b> above to create one — e.g. "Student Registration", "Principal Registration", "Coordinator Registration".</div>`;
    return;
  }
  allForms.forEach((f) => {
    const card = document.createElement('div');
    card.className = 'form-card' + (f.id === currentFormId ? ' active' : '');
    card.innerHTML = `
      <div class="fc-title">${escapeHtml(f.formTitle)}</div>
      ${f.formTitleMr ? `<div class="fc-title-mr">${escapeHtml(f.formTitleMr)}</div>` : ''}
      <div class="fc-meta"><span><b>${f.fields.length}</b> fields</span><span><b>${f.responseCount}</b> responses</span></div>
      <div class="fc-actions">
        <button data-action="open" title="Open shared link">↗ Link</button>
        <button data-action="edit" title="Edit fields">🛠 Edit</button>
        <button data-action="delete" title="Delete form">🗑</button>
      </div>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-action]')) return; // handled separately below
      selectForm(f.id);
    });
    card.querySelector('[data-action="open"]').addEventListener('click', (e) => {
      e.stopPropagation();
      window.open(getFormUrl(f), '_blank');
    });
    card.querySelector('[data-action="edit"]').addEventListener('click', async (e) => {
      e.stopPropagation();
      await selectForm(f.id);
      openBuilderForEdit();
    });
    card.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteForm(f.id, f.formTitle);
    });
    formsGrid.appendChild(card);
  });
}

async function selectForm(formId) {
  currentFormId = formId;
  shortlist = new Set();
  knownIds = new Set();
  mode = 'new';
  if (pollTimer) clearInterval(pollTimer);

  const res = await fetch(API.formById(formId));
  if (!res.ok) { showToast('⚠️ Could not load that form.'); return; }
  formConfig = await res.json();

  selectedFormPanel.style.display = '';
  document.getElementById('selectedFormTitle').textContent = formConfig.formTitle;
  renderFormsGrid();
  renderFilters();
  updateFormLinkPreview();
  tableWrap.innerHTML = `<div class="empty-state" id="emptyState"><div class="icon">📋</div><b>Nothing to show yet.</b><br>Click the "Preview on Dashboard" button above — all columns of data will open right here.</div>`;

  await loadResponses();
  startPolling();
}

async function deleteForm(formId, title) {
  if (!confirm(`Delete the form "${title}" and ALL of its collected responses? This cannot be undone.`)) return;
  try {
    const res = await adminFetch(API.formById(formId), { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error || 'Delete failed.');
    showToast('Form deleted ✓');
    if (currentFormId === formId) {
      currentFormId = null;
      formConfig = null;
      if (pollTimer) clearInterval(pollTimer);
      selectedFormPanel.style.display = 'none';
    }
    await loadForms();
  } catch (err) {
    showToast('⚠️ ' + err.message);
  }
}

// ------------------------------------------------------------------ data loading (scoped to currentFormId)
async function loadResponses({ silent } = {}) {
  if (!currentFormId) return;
  const res = await fetch(API.responses(currentFormId));
  const data = await res.json();
  const incoming = data.responses || [];

  const newlyArrived = incoming.filter((r) => !knownIds.has(r.id) && knownIds.size > 0);
  knownIds = new Set(incoming.map((r) => r.id));
  allResponses = incoming;

  updateStats();
  applyFilters({ flashIds: newlyArrived.map((r) => r.id) });

  // Keep the forms grid's response counts fresh without a full reload.
  const gridEntry = allForms.find((f) => f.id === currentFormId);
  if (gridEntry) gridEntry.responseCount = allResponses.length;

  if (silent && newlyArrived.length) {
    showToast(`🔔 ${newlyArrived.length} new response${newlyArrived.length > 1 ? 's' : ''} came in live ✓`);
  }
}

function startPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => loadResponses({ silent: true }), POLL_MS);
}

function updateFormLinkPreview() {
  const el = document.getElementById('formLinkPreview');
  const openBtn = document.getElementById('openFormBtn');
  if (formConfig) {
    el.textContent = `${formConfig.fields.length} fields · shareable at ${getFormUrl()}`;
    openBtn.disabled = false;
  }
}

// ------------------------------------------------------------------ stats
function updateStats() {
  document.getElementById('statTotal').textContent = allResponses.length;
  const responseField = formConfig.fields.find((f) => f.key === 'response') || formConfig.fields.find((f) => f.type === 'select');
  if (responseField) {
    const count = (val) => allResponses.filter((r) => r.values[responseField.key] === val).length;
    document.getElementById('statConfirmed').textContent = count('Confirmed');
    document.getElementById('statPending').textContent = count('Pending');
  } else {
    document.getElementById('statConfirmed').textContent = '–';
    document.getElementById('statPending').textContent = '–';
  }
  document.getElementById('dashSubtitle').textContent =
    `Viewing "${formConfig.formTitle}" · ${formConfig.fields.length} filterable columns · updates automatically as the shared form is filled out.`;
}

// ------------------------------------------------------------------ filters (dynamic)
function renderFilters() {
  dynamicFilters.innerHTML = '';
  formConfig.fields.filter((f) => f.filterable).forEach((f) => {
    const wrap = document.createElement('div');
    wrap.className = 'field';
    const options = f.options && f.options.length ? f.options : [...new Set(allResponses.map((r) => r.values[f.key]).filter(Boolean))].sort();
    wrap.innerHTML = `
      <label for="filter-${f.key}">${f.label}</label>
      <select id="filter-${f.key}" data-key="${f.key}">
        <option value="">All</option>
        ${options.map((o) => `<option value="${escapeAttr(o)}">${escapeHtml(o)}</option>`).join('')}
      </select>
    `;
    dynamicFilters.appendChild(wrap);
  });
  dynamicFilters.querySelectorAll('select').forEach((el) => {
    el.addEventListener('input', () => {
      if (mode === 'new' && (currentRows.length || tableWrap.querySelector('table'))) applyFilters();
    });
  });
}

function refreshFilterOptions() {
  // keep filter dropdown option lists current as new distinct values arrive live
  formConfig.fields.filter((f) => f.filterable && !(f.options && f.options.length)).forEach((f) => {
    const sel = document.getElementById(`filter-${f.key}`);
    if (!sel) return;
    const current = sel.value;
    const options = [...new Set(allResponses.map((r) => r.values[f.key]).filter(Boolean))].sort();
    sel.innerHTML = `<option value="">All</option>` + options.map((o) => `<option value="${escapeAttr(o)}">${escapeHtml(o)}</option>`).join('');
    sel.value = current;
  });
}

function applyFilters({ flashIds = [] } = {}) {
  refreshFilterOptions();
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const activeFilters = {};
  dynamicFilters.querySelectorAll('select').forEach((el) => {
    if (el.value) activeFilters[el.dataset.key] = el.value;
  });
  const searchableKeys = formConfig.fields.filter((f) => f.searchable).map((f) => f.key);

  const rows = allResponses.filter((r) => {
    const matchesQ = !q || searchableKeys.some((k) => String(r.values[k] || '').toLowerCase().includes(q));
    const matchesFilters = Object.entries(activeFilters).every(([k, v]) => r.values[k] === v);
    return matchesQ && matchesFilters;
  });
  renderTable(rows, flashIds);
}

// ------------------------------------------------------------------ table
function responseTag(value) {
  const v = (value || '').toLowerCase();
  const cls = v === 'confirmed' ? 'tag-confirmed' : v === 'pending' ? 'tag-pending' : v === 'declined' ? 'tag-declined' : 'tag-code';
  return `<span class="tag ${cls}">${escapeHtml(value)}</span>`;
}

function cellFor(field, record) {
  const val = record.values[field.key] ?? '';
  if (field.key === 'aishe' || (field.type === 'text' && field.key.toLowerCase().includes('code'))) {
    return `<span class="tag tag-code">${escapeHtml(val)}</span>`;
  }
  if (field.type === 'select' && (field.options || []).some((o) => ['confirmed', 'pending', 'declined'].includes(o.toLowerCase()))) {
    return responseTag(val);
  }
  if (field.type === 'tel') return `<span class="sub mono">${escapeHtml(val)}</span>`;
  if (['principal', 'coord', 'college'].includes(field.key) || field.key.toLowerCase().includes('name')) {
    return `<span class="${field.key === 'college' ? 'college' : 'sub'}">${escapeHtml(val)}</span>`;
  }
  return `<span class="sub">${escapeHtml(val)}</span>`;
}

function renderTable(rows, flashIds = []) {
  currentRows = rows;
  if (rows.length === 0) {
    tableWrap.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><b>No records found.</b><br>Try adjusting the filters, or share the form link to collect responses.</div>`;
    return;
  }
  const fields = formConfig.fields;
  let html = `
    <div class="result-count">
      <span>${rows.length} records found</span>
      <span class="sub" id="lastUpdated"></span>
    </div>
    <table>
      <thead>
        <tr>
          <th style="width:34px;"><input type="checkbox" id="selectAllBox" title="Select all" onchange="toggleSelectAll(this)"></th>
          <th>Sr No</th>
          ${fields.map((f) => `<th>${escapeHtml(f.label)}</th>`).join('')}
          <th>Source</th>
          <th style="width:40px;"></th>
        </tr>
      </thead>
      <tbody>
  `;
  rows.forEach((row) => {
    const key = uniqueKeyOf(row);
    const checked = shortlist.has(key) ? 'checked' : '';
    const classes = [shortlist.has(key) ? 'shortlisted' : '', flashIds.includes(row.id) ? 'just-in' : ''].filter(Boolean).join(' ');
    html += `
      <tr class="${classes}" data-key="${escapeAttr(key)}" data-id="${row.id}">
        <td><input type="checkbox" ${checked} onchange="toggleShortlist('${escapeAttr(key)}', this)"></td>
        <td class="sub">${row.sr}</td>
        ${fields.map((f) => `<td>${cellFor(f, row)}</td>`).join('')}
        <td><span class="tag tag-source-${row.source === 'form' ? 'form' : 'seed'}">${row.source === 'form' ? 'Live form' : 'Seed'}</span></td>
        <td><button class="icon-btn" title="Delete this response" onclick="deleteResponse('${row.id}')">✕</button></td>
      </tr>
    `;
  });
  html += `
      </tbody>
    </table>
    <div class="table-footer" id="tableFooter">
      <div class="shortlist-count" id="footerCount">Shortlisted: <b>0</b> / ${rows.length}</div>
      <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
        <span class="sub" id="hintText" style="font-size:12px;">⬅ Tick the checkbox on a row to select it (or use the header checkbox to select all)</span>
        <button class="btn btn-gold" id="exportShortlistBtn" disabled onclick="exportShortlist()">Download Shortlisted (.xlsx)</button>
      </div>
    </div>
  `;
  tableWrap.innerHTML = html;
  updateShortlistUI();
}

function toggleShortlist(key, checkbox) {
  if (checkbox.checked) shortlist.add(key); else shortlist.delete(key);
  const tr = checkbox.closest('tr');
  tr.classList.toggle('shortlisted', checkbox.checked);
  updateShortlistUI();
}

function toggleSelectAll(box) {
  currentRows.forEach((r) => {
    const key = uniqueKeyOf(r);
    if (box.checked) shortlist.add(key); else shortlist.delete(key);
  });
  renderTable(currentRows);
}

function updateShortlistUI() {
  shortlistStatValue.textContent = shortlist.size;
  const footerCount = document.getElementById('footerCount');
  if (footerCount) {
    footerCount.innerHTML = 'Shortlisted: <b>' + shortlist.size + '</b> / ' + currentRows.length;
    document.getElementById('exportShortlistBtn').disabled = shortlist.size === 0;
    const hint = document.getElementById('hintText');
    if (hint) hint.style.display = shortlist.size === 0 ? 'inline' : 'none';
  }
  const selectAllBox = document.getElementById('selectAllBox');
  if (selectAllBox) {
    selectAllBox.checked = currentRows.length > 0 && currentRows.every((r) => shortlist.has(uniqueKeyOf(r)));
  }
  bulkDeleteBtn.style.display = shortlist.size ? 'inline-flex' : 'none';
}

// ------------------------------------------------------------------ delete (responses)
async function deleteResponse(id) {
  if (!confirm('Delete this response? This cannot be undone.')) return;
  try {
    const res = await adminFetch(API.responseById(currentFormId, id), { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error || 'Delete failed.');
    showToast('Response deleted ✓');
    await loadResponses();
  } catch (err) {
    showToast('⚠️ ' + err.message);
  }
}

bulkDeleteBtn.addEventListener('click', async () => {
  const ids = allResponses.filter((r) => shortlist.has(uniqueKeyOf(r))).map((r) => r.id);
  if (!ids.length) return;
  if (!confirm(`Delete ${ids.length} shortlisted response(s)? This cannot be undone.`)) return;
  try {
    const res = await adminFetch(API.bulkDelete(currentFormId), { method: 'POST', body: JSON.stringify({ ids }) });
    if (!res.ok) throw new Error((await res.json()).error || 'Delete failed.');
    shortlist.clear();
    showToast('Shortlisted responses deleted ✓');
    await loadResponses();
  } catch (err) {
    showToast('⚠️ ' + err.message);
  }
});

// ------------------------------------------------------------------ export
function rowsToSheetData(rows) {
  const fields = formConfig.fields;
  return [
    ['Sr No', ...fields.map((f) => f.label), 'Source', 'Submitted At'],
    ...rows.map((r) => [r.sr, ...fields.map((f) => r.values[f.key] || ''), r.source, r.submittedAt])
  ];
}

function isXlsxReady() {
  return typeof XLSX !== 'undefined' && !!(XLSX.utils && XLSX.writeFile);
}

function whenXlsxReady(action) {
  if (isXlsxReady()) { action(); return; }
  if (window.__xlsxFailed) { showToast('⚠️ Excel library failed to load — check your internet connection and reopen the page.'); return; }
  showToast('Loading Excel library, please wait...');
  let attempts = 0;
  const retry = setInterval(() => {
    attempts++;
    if (isXlsxReady()) { clearInterval(retry); action(); }
    else if (attempts > 20) { clearInterval(retry); showToast("⚠️ Excel library still hasn't loaded — your network may be slow, please try again."); }
  }, 500);
}

function exportShortlist() {
  whenXlsxReady(() => {
    const rows = currentRows.filter((r) => shortlist.has(uniqueKeyOf(r)));
    const ws = XLSX.utils.aoa_to_sheet(rowsToSheetData(rows));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Shortlisted');
    const fname = (formConfig.slug || 'shortlisted') + '_shortlisted.xlsx';
    XLSX.writeFile(wb, fname);
    showToast(rows.length + ' shortlisted records downloaded ✓');
  });
}

function exportAllOldWay() {
  whenXlsxReady(() => {
    const ws = XLSX.utils.aoa_to_sheet(rowsToSheetData(allResponses));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'All Responses');
    const fname = (formConfig.slug || 'form') + '_export.xlsx';
    XLSX.writeFile(wb, fname);
    document.getElementById('oldFlash').classList.add('show');
  });
}

// ------------------------------------------------------------------ preview / mode toggle
document.getElementById('previewBtn').addEventListener('click', () => {
  if (mode === 'old') { exportAllOldWay(); return; }
  applyFilters();
  showToast('Data opened right here on the dashboard — no file was downloaded ✓');
});

document.getElementById('closeOldFlash').addEventListener('click', () => {
  document.getElementById('oldFlash').classList.remove('show');
});

document.getElementById('clearBtn').addEventListener('click', () => {
  document.getElementById('searchInput').value = '';
  dynamicFilters.querySelectorAll('select').forEach((s) => (s.value = ''));
  applyFilters();
});

document.getElementById('btnModeNew').addEventListener('click', function () {
  mode = 'new';
  this.classList.add('active');
  document.getElementById('btnModeOld').classList.remove('active');
  document.getElementById('previewBtn').textContent = '⤓ Preview on Dashboard';
});
document.getElementById('btnModeOld').addEventListener('click', function () {
  mode = 'old';
  this.classList.add('active');
  document.getElementById('btnModeNew').classList.remove('active');
  document.getElementById('previewBtn').textContent = '⤓ Export to Excel';
});

document.getElementById('searchInput').addEventListener('input', () => {
  if (mode === 'new' && (currentRows.length || tableWrap.querySelector('table'))) applyFilters();
});

// ------------------------------------------------------------------ form builder (create new form OR edit selected form)
const FIELD_TYPES = ['text', 'tel', 'email', 'textarea', 'select'];
let builderFields = [];

// Common starter-field presets, so building "Student Registration" etc. is fast.
const FIELD_PRESETS = {
  student: [
    { label: 'Student Name', type: 'text', required: true, filterable: false, searchable: true },
    { label: 'Mobile Number', type: 'tel', required: true, filterable: false, searchable: false },
    { label: 'Taluka', type: 'text', required: true, filterable: true, searchable: false },
    { label: 'District', type: 'text', required: true, filterable: true, searchable: false },
    { label: 'College Name', type: 'text', required: true, filterable: false, searchable: true }
  ],
  principal: [
    { label: 'Principal Name', type: 'text', required: true, filterable: false, searchable: true },
    { label: 'Mobile Number', type: 'tel', required: true, filterable: false, searchable: false },
    { label: 'Email ID', type: 'email', required: false, filterable: false, searchable: false },
    { label: 'College Name', type: 'text', required: true, filterable: false, searchable: true },
    { label: 'Taluka', type: 'text', required: true, filterable: true, searchable: false },
    { label: 'District', type: 'text', required: true, filterable: true, searchable: false }
  ],
  coordinator: [
    { label: 'Coordinator Name', type: 'text', required: true, filterable: false, searchable: true },
    { label: 'Mobile Number', type: 'tel', required: true, filterable: false, searchable: false },
    { label: 'Email ID', type: 'email', required: false, filterable: false, searchable: false },
    { label: 'College Name', type: 'text', required: true, filterable: false, searchable: true },
    { label: 'Taluka', type: 'text', required: true, filterable: true, searchable: false },
    { label: 'District', type: 'text', required: true, filterable: true, searchable: false }
  ]
};

function slugify(label) {
  const base = (label || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
  let key = base, n = 1;
  while (builderFields.some((f) => f.key === key)) key = `${base}_${n++}`;
  return key;
}

function addPresetFields(fields) {
  fields.forEach((f) => builderFields.push({ ...f, key: slugify(f.label) }));
  drawBuilderFields();
}

function drawBuilderFields() {
  const list = document.getElementById('fieldsList');
  list.innerHTML = '';
  builderFields.forEach((f, idx) => {
    const row = document.createElement('div');
    row.className = 'field-row';
    row.innerHTML = `
      <div class="field">
        <label>Field label</label>
        <input type="text" value="${escapeAttr(f.label)}" data-idx="${idx}" data-prop="label">
      </div>
      <div class="field">
        <label>Type</label>
        <select data-idx="${idx}" data-prop="type">
          ${FIELD_TYPES.map((t) => `<option value="${t}" ${f.type === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="req-toggle">
        <input type="checkbox" ${f.required ? 'checked' : ''} data-idx="${idx}" data-prop="required" id="req-${idx}">
        <label for="req-${idx}">Required</label>
      </div>
      <div class="req-toggle">
        <input type="checkbox" ${f.filterable ? 'checked' : ''} data-idx="${idx}" data-prop="filterable" id="filt-${idx}">
        <label for="filt-${idx}">Filterable</label>
      </div>
      <button class="icon-btn" title="Delete field" data-idx="${idx}" data-action="delete-field">✕</button>
      ${f.type === 'select' ? `
        <div class="field options-row">
          <label>Options (comma separated)</label>
          <input type="text" value="${escapeAttr((f.options || []).join(', '))}" data-idx="${idx}" data-prop="options" placeholder="e.g. Confirmed, Pending, Declined">
        </div>
      ` : ''}
    `;
    list.appendChild(row);
  });

  list.querySelectorAll('[data-prop]').forEach((el) => {
    const evt = el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      const idx = Number(el.dataset.idx);
      const prop = el.dataset.prop;
      if (prop === 'required') builderFields[idx].required = el.checked;
      else if (prop === 'filterable') builderFields[idx].filterable = el.checked;
      else if (prop === 'options') builderFields[idx].options = el.value.split(',').map((s) => s.trim()).filter(Boolean);
      else if (prop === 'label') {
        builderFields[idx].label = el.value;
        builderFields[idx].key = builderFields[idx].key || slugify(el.value);
      } else if (prop === 'type') {
        builderFields[idx].type = el.value;
        drawBuilderFields();
      }
    });
  });
  list.querySelectorAll('[data-action="delete-field"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      builderFields.splice(Number(btn.dataset.idx), 1);
      drawBuilderFields();
    });
  });
}

document.getElementById('addFieldBtn').addEventListener('click', () => {
  const label = `New field ${builderFields.length + 1}`;
  builderFields.push({ key: slugify(label), label, type: 'text', required: false, filterable: false, searchable: false });
  drawBuilderFields();
});

function openBuilderForCreate() {
  builderContext = 'create';
  builderFields = [];
  document.getElementById('formTitleInput').value = '';
  document.getElementById('formDescInput').value = '';
  document.getElementById('builderModalTitle').textContent = 'Create a new form';
  document.getElementById('builderModalSub').textContent = 'Give it a title, add fields (or start from a preset), then save to get a shareable link.';
  document.getElementById('saveFormBtn').textContent = 'Create form & get link';
  document.getElementById('deleteFormBtn').style.display = 'none';
  document.getElementById('linkArea').style.display = 'none';
  drawBuilderFields();
  renderPresetBar();
  renderBannerSection();
  document.getElementById('builderBackdrop').classList.add('show');
}

function openBuilderForEdit() {
  if (!formConfig) return;
  builderContext = 'edit';
  builderFields = formConfig.fields.map((f) => ({ ...f }));
  document.getElementById('formTitleInput').value = formConfig.formTitle || '';
  document.getElementById('formDescInput').value = formConfig.formDescription || '';
  document.getElementById('builderModalTitle').textContent = `Edit "${formConfig.formTitle}"`;
  document.getElementById('builderModalSub').textContent = 'Add or remove fields, mark what\'s required or filterable. The link stays the same after saving.';
  document.getElementById('saveFormBtn').textContent = 'Save changes';
  document.getElementById('deleteFormBtn').style.display = 'inline-flex';
  document.getElementById('linkArea').style.display = 'block';
  document.getElementById('shareLink').textContent = getFormUrl();
  drawBuilderFields();
  renderPresetBar();
  renderBannerSection();
  document.getElementById('builderBackdrop').classList.add('show');
}

function renderPresetBar() {
  let bar = document.getElementById('presetBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'presetBar';
    bar.style.cssText = 'display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px;';
    document.getElementById('fieldsList').insertAdjacentElement('beforebegin', bar);
  }
  bar.innerHTML = `
    <span class="sub" style="align-self:center; font-size:12px;">Quick start:</span>
    <button type="button" class="btn btn-ghost btn-sm" data-preset="student">+ Student fields</button>
    <button type="button" class="btn btn-ghost btn-sm" data-preset="principal">+ Principal fields</button>
    <button type="button" class="btn btn-ghost btn-sm" data-preset="coordinator">+ Coordinator fields</button>
  `;
  bar.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => addPresetFields(FIELD_PRESETS[btn.dataset.preset]));
  });
}

// ------------------------------------------------------------------ banner / flyer
function renderBannerSection() {
  const section = document.getElementById('bannerSection');
  const hint = document.getElementById('bannerHint');
  const previewWrap = document.getElementById('bannerPreviewWrap');
  const previewImg = document.getElementById('bannerPreviewImg');
  const uploadWrap = document.getElementById('bannerUploadWrap');

  // Banner upload needs a real formId, so it's only available once the form exists.
  if (builderContext !== 'edit' || !currentFormId) {
    section.style.display = 'none';
    hint.style.display = '';
    return;
  }
  hint.style.display = 'none';
  section.style.display = '';

  if (formConfig && formConfig.bannerUrl) {
    previewWrap.style.display = 'flex';
    uploadWrap.style.display = 'none';
    previewImg.src = formConfig.bannerUrl + '?t=' + Date.now();
  } else {
    previewWrap.style.display = 'none';
    uploadWrap.style.display = '';
  }
}

document.getElementById('bannerFileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!currentFormId) { showToast('⚠️ आधी फॉर्म save करा.'); return; }

  const fd = new FormData();
  fd.append('banner', file);
  try {
    showToast('Banner अपलोड होत आहे...');
    const res = await adminFetch(API.banner(currentFormId), { method: 'POST', body: fd });
    if (!res.ok) throw new Error((await res.json()).error || 'Upload failed.');
    formConfig = await res.json();
    renderBannerSection();
    await loadForms();
    showToast('Banner जोडला ✓');
  } catch (err) {
    showToast('⚠️ ' + err.message);
  } finally {
    e.target.value = '';
  }
});

document.getElementById('removeBannerBtn').addEventListener('click', async () => {
  if (!currentFormId) return;
  if (!confirm('हा banner काढून टाकायचा आहे का?')) return;
  try {
    const res = await adminFetch(API.banner(currentFormId), { method: 'DELETE' });
    if (!res.ok) throw new Error((await res.json()).error || 'Remove failed.');
    formConfig = await res.json();
    renderBannerSection();
    await loadForms();
    showToast('Banner काढला ✓');
  } catch (err) {
    showToast('⚠️ ' + err.message);
  }
});

document.getElementById('newFormBtn').addEventListener('click', openBuilderForCreate);
document.getElementById('openBuilderBtn').addEventListener('click', openBuilderForEdit);
document.getElementById('closeBuilderBtn').addEventListener('click', () => document.getElementById('builderBackdrop').classList.remove('show'));
document.getElementById('cancelBuilderBtn').addEventListener('click', () => document.getElementById('builderBackdrop').classList.remove('show'));

document.getElementById('saveFormBtn').addEventListener('click', async () => {
  if (!builderFields.length) { showToast('⚠️ Add at least one field first.'); return; }
  if (builderFields.some((f) => !f.label.trim())) { showToast('⚠️ Every field needs a label.'); return; }
  const title = document.getElementById('formTitleInput').value.trim();
  if (!title) { showToast('⚠️ Give the form a title first.'); return; }

  const payload = {
    formTitle: title,
    formDescription: document.getElementById('formDescInput').value.trim(),
    uniqueField: builderContext === 'edit' && formConfig ? formConfig.uniqueField : builderFields[0].key,
    fields: builderFields.map((f) => ({
      key: f.key,
      label: f.label.trim(),
      type: f.type,
      required: !!f.required,
      filterable: !!f.filterable,
      searchable: f.type !== 'select',
      ...(f.type === 'select' ? { options: f.options || [] } : {})
    }))
  };

  try {
    if (builderContext === 'create') {
      const res = await adminFetch(API.forms, { method: 'POST', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error || 'Create failed.');
      const created = await res.json();
      await loadForms();
      await selectForm(created.id);
      document.getElementById('shareLink').textContent = getFormUrl();
      document.getElementById('linkArea').style.display = 'block';
      document.getElementById('builderModalTitle').textContent = `Edit "${created.formTitle}"`;
      document.getElementById('saveFormBtn').textContent = 'Save changes';
      document.getElementById('deleteFormBtn').style.display = 'inline-flex';
      builderContext = 'edit';
      renderBannerSection();
      showToast('Form created — share the link below ✓');
    } else {
      const res = await adminFetch(API.formById(currentFormId), { method: 'PUT', body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed.');
      formConfig = await res.json();
      document.getElementById('selectedFormTitle').textContent = formConfig.formTitle;
      renderFilters();
      updateFormLinkPreview();
      await loadResponses();
      await loadForms();
      document.getElementById('shareLink').textContent = getFormUrl();
      document.getElementById('linkArea').style.display = 'block';
      renderBannerSection();
      showToast('Form saved ✓');
    }
  } catch (err) {
    showToast('⚠️ ' + err.message);
  }
});

document.getElementById('deleteFormBtn').addEventListener('click', async () => {
  if (!formConfig) return;
  document.getElementById('builderBackdrop').classList.remove('show');
  await deleteForm(formConfig.id, formConfig.formTitle);
});

document.getElementById('copyLinkBtn').addEventListener('click', () => {
  navigator.clipboard.writeText(getFormUrl()).then(() => showToast('Link copied ✓'));
});

// ------------------------------------------------------------------ manual add-response modal
document.getElementById('addResponseBtn').addEventListener('click', () => {
  if (!formConfig) { showToast('⚠️ Select or create a form first.'); return; }
  drawAddForm();
  document.getElementById('addBackdrop').classList.add('show');
});
document.getElementById('closeAddBtn').addEventListener('click', () => document.getElementById('addBackdrop').classList.remove('show'));
document.getElementById('cancelAddBtn').addEventListener('click', () => document.getElementById('addBackdrop').classList.remove('show'));

function drawAddForm() {
  const body = document.getElementById('addFormBody');
  body.innerHTML = formConfig.fields.map((f) => {
    if (f.type === 'select') {
      return `<div class="field full" style="margin-bottom:12px;">
        <label>${escapeHtml(f.label)}${f.required ? ' *' : ''}</label>
        <select data-key="${f.key}">
          <option value="">Select…</option>
          ${(f.options || []).map((o) => `<option value="${escapeAttr(o)}">${escapeHtml(o)}</option>`).join('')}
        </select>
      </div>`;
    }
    return `<div class="field full" style="margin-bottom:12px;">
      <label>${escapeHtml(f.label)}${f.required ? ' *' : ''}</label>
      <input type="${f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : 'text'}" data-key="${f.key}">
    </div>`;
  }).join('');
}

document.getElementById('saveAddBtn').addEventListener('click', async () => {
  const values = {};
  document.getElementById('addFormBody').querySelectorAll('[data-key]').forEach((el) => (values[el.dataset.key] = el.value.trim()));
  const missing = formConfig.fields.filter((f) => f.required && !values[f.key]);
  if (missing.length) { showToast('⚠️ Fill required fields: ' + missing.map((f) => f.label).join(', ')); return; }
  try {
    const res = await adminFetch(API.manual(currentFormId), { method: 'POST', body: JSON.stringify({ values }) });
    if (!res.ok) throw new Error((await res.json()).error || 'Save failed.');
    document.getElementById('addBackdrop').classList.remove('show');
    showToast('Response added ✓');
    await loadResponses();
  } catch (err) {
    showToast('⚠️ ' + err.message);
  }
});

// ------------------------------------------------------------------ utils
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }

// ------------------------------------------------------------------ boot
(async function init() {
  await loadForms();
})();
