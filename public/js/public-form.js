/* Career Katta — public-form.js
 * Renders the response form purely from /api/form-config, so whatever
 * the admin builds in the dashboard's form builder shows up here
 * automatically — add a field there, it appears here; delete it there,
 * it disappears here. Submits to /api/responses, which is exactly what
 * the dashboard polls, so a submission shows up live with no extra step.
 */

const toast = document.getElementById('toast');
const toastText = document.getElementById('toastText');

function showToast(msg) {
  toastText.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2800);
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let formConfig = null;

function fieldMarkup(f) {
  const req = f.required ? '<span class="req">*</span>' : '';
  if (f.type === 'select') {
    return `
      <div class="form-field" data-key="${f.key}">
        <label>${escapeHtml(f.label)}${req}</label>
        <select data-key="${f.key}" ${f.required ? 'required' : ''}>
          <option value="">Select…</option>
          ${(f.options || []).map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}
        </select>
        <span class="err">This field is required.</span>
      </div>`;
  }
  if (f.type === 'textarea') {
    return `
      <div class="form-field" data-key="${f.key}">
        <label>${escapeHtml(f.label)}${req}</label>
        <textarea data-key="${f.key}" rows="3" ${f.required ? 'required' : ''}></textarea>
        <span class="err">This field is required.</span>
      </div>`;
  }
  const inputType = f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : 'text';
  return `
    <div class="form-field" data-key="${f.key}">
      <label>${escapeHtml(f.label)}${req}</label>
      <input type="${inputType}" data-key="${f.key}" ${f.required ? 'required' : ''}>
      <span class="err">This field is required.</span>
    </div>`;
}

async function init() {
  try {
    const params = new URLSearchParams(window.location.search);
    const formId = params.get('form') || params.get('id');
    if (!formId) throw new Error('No form specified. Use the exact link shared with you (it includes ?form=...).');

    const res = await fetch(`/api/forms/${encodeURIComponent(formId)}`);
    if (!res.ok) throw new Error(res.status === 404 ? 'This form link is invalid or the form was removed.' : 'Could not load the form.');
    formConfig = await res.json();

    document.getElementById('formTitle').textContent = formConfig.formTitle || 'College Response Form';
    document.getElementById('formDesc').textContent = formConfig.formDescription || '';
    document.getElementById('footNote').textContent =
      'Your response is sent straight to the Career Katta team and appears on their dashboard immediately.';

    const bannerEl = document.getElementById('formBanner');
    if (formConfig.bannerUrl) {
      bannerEl.src = formConfig.bannerUrl;
      bannerEl.style.display = '';
    } else {
      bannerEl.style.display = 'none';
    }

    const body = document.getElementById('formBody');
    body.innerHTML = formConfig.fields.map(fieldMarkup).join('') +
      `<button class="btn btn-primary form-submit" id="submitBtn">Submit response</button>`;

    document.getElementById('submitBtn').addEventListener('click', onSubmit);
  } catch (err) {
    document.getElementById('formTitle').textContent = 'Form unavailable';
    document.getElementById('formDesc').textContent = err.message;
  }
}

async function onSubmit() {
  const values = {};
  let firstInvalid = null;

  document.querySelectorAll('.form-field').forEach((wrap) => {
    const input = wrap.querySelector('[data-key]');
    const key = input.dataset.key;
    const val = input.value.trim();
    values[key] = val;
    const field = formConfig.fields.find((f) => f.key === key);
    const invalid = field.required && !val;
    wrap.classList.toggle('invalid', invalid);
    if (invalid && !firstInvalid) firstInvalid = wrap;
  });

  if (firstInvalid) {
    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showToast('⚠️ Please fill in the required fields.');
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  try {
    const res = await fetch(`/api/forms/${encodeURIComponent(formConfig.id)}/responses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Submission failed.');

    document.getElementById('formCard').innerHTML = `
      <div class="form-success">
        <div class="tick">✓</div>
        <h2>Response recorded</h2>
        <p>Thank you — your response has been saved and is now visible live on the Career Katta dashboard.</p>
      </div>`;
  } catch (err) {
    showToast('⚠️ ' + err.message);
    btn.disabled = false;
    btn.textContent = 'Submit response';
  }
}

init();
