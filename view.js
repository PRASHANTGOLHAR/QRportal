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
      card.innerHTML = `<p class="status err">Record not found.</p>`;
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

    let html = `<h2>${escapeHtml(f.Name || "Shared info")}</h2>`;

    html += section("1. Technical Specifications", f["Technical Specifications"]);
    html += refresherSection("2. Quick Refresher", f["Quick Refresher"]);
    html += section("3. Safety Aspects", f["Safety Aspects"]);
    html += section("4. Operation Aspect", f["Operation Aspect"]);
    html += section("5. Rescue Aspect", f["Rescue Aspect"]);

    if (ppt || pdf) {
      html += `<h3 class="sec-title">Resources</h3><div class="file-grid">`;
      if (ppt) html += fileCard("ppt", "View PPT", "Presentation slides", ppt, "📊");
      if (pdf) html += fileCard("pdf", "View PDF / SOP", "Document & procedures", pdf, "📄");
      html += `</div>`;
      if (pdf) html += `<iframe class="preview" src="${pdf.url}" title="PDF preview"></iframe>`;
    }

    card.innerHTML = html;
  } catch (err) {
    console.error(err);
    card.innerHTML = `<p class="status err">${escapeHtml(err.message)}</p>`;
  }

  function section(title, text) {
    if (!text) return "";
    return `<h3 class="sec-title">${escapeHtml(title)}</h3><p class="sec-body">${escapeHtml(text).replace(/\n/g, "<br>")}</p>`;
  }
  function refresherSection(title, text) {
    if (!text) return "";
    const items = String(text).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (!items.length) return "";
    return `<h3 class="sec-title">${escapeHtml(title)}</h3><ul class="sec-list">${
      items.map(i => `<li>${escapeHtml(i)}</li>`).join("")
    }</ul>`;
  }
  function fileCard(cls, label, sub, att, icon) {
    const fname = escapeHtml(att.filename || label);
    return `
      <div class="file-card ${cls}">
        <div class="file-icon">${icon}</div>
        <div class="file-info">
          <div class="file-title">${label}</div>
          <div class="file-sub">${sub}</div>
          <div class="file-name" title="${fname}">${fname}</div>
        </div>
        <div class="file-actions">
          <a class="file-btn primary" href="${att.url}" target="_blank" rel="noopener">Open</a>
          <a class="file-btn ghost" href="${att.url}" download="${fname}">Download</a>
        </div>
      </div>`;
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
  }
})();
