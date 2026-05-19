/* same config as script.js — keep token + base in sync */
const AIRTABLE_TOKEN = "patdDjF8LQNiHPbIv.ea6b727c91d93fd979616f6a36918f928b1ff1ae8b6d635639e16e0358aa4d56";   // Personal Access Token
const AIRTABLE_BASE  = "appV4lbFKyi2wKI0N";  
const TABLE_NAME     = "QRCodes";

(async function () {
  const card = document.getElementById("view-card");
  const id = new URLSearchParams(location.search).get("id");

  if (!id) {
    card.innerHTML = `<p class="status err">Missing <code>?id=</code> parameter in the URL.</p>`;
    return;
  }
  if (AIRTABLE_TOKEN.startsWith("YOUR_") || AIRTABLE_BASE.startsWith("YOUR_")) {
    card.innerHTML = `<p class="status err">Airtable token / base ID not configured in <code>view.js</code>.</p>`;
    return;
  }

  card.innerHTML = `<p>Loading…</p>`;

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(TABLE_NAME)}/${encodeURIComponent(id)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });

    if (res.status === 404) {
      card.innerHTML = `<p class="status err">Record not found. The QR may be invalid or the record was deleted.</p>`;
      return;
    }
    if (res.status === 401 || res.status === 403) {
      card.innerHTML = `<p class="status err">Not authorized. Check the Airtable token in view.js.</p>`;
      return;
    }
    if (!res.ok) throw new Error(`Airtable ${res.status}: ${await res.text()}`);

    const rec = await res.json();
    const f = rec.fields || {};
    const pdf = Array.isArray(f.PDF) ? f.PDF[0] : null;
    const ppt = Array.isArray(f.PPT) ? f.PPT[0] : null;

    let html = `<h2>${escapeHtml(f.Name || "Shared files")}</h2>`;

    if (!pdf && !ppt) {
      html += `<p class="status err">No files attached to this record.</p>`;
    } else {
      html += `<p class="muted">Choose a file to view or download:</p><div class="file-buttons">`;
      if (pdf) html += fileBtn("pdf", "📄 View PDF", pdf);
      if (ppt) html += fileBtn("ppt", "📊 View PPT", ppt);
      html += `</div>`;

      if (pdf) html += `<iframe class="preview" src="${pdf.url}" title="PDF preview"></iframe>`;
    }

    card.innerHTML = html;
  } catch (err) {
    console.error(err);
    card.innerHTML = `<p class="status err">${escapeHtml(err.message)}</p>`;
  }

  function fileBtn(cls, label, att) {
    return `
      <div class="file-row">
        <a class="${cls}" href="${att.url}" target="_blank" rel="noopener">${label}</a>
        <a class="dl" href="${att.url}" download="${escapeHtml(att.filename || label)}">⬇ Download</a>
      </div>`;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
})();
