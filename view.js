/* same config as script.js — keep in sync */
const AIRTABLE_TOKEN = "patdDjF8LQNiHPbIv.ea6b727c91d93fd979616f6a36918f928b1ff1ae8b6d635639e16e0358aa4d56";   // Personal Access Token
const AIRTABLE_BASE  = "appV4lbFKyi2wKI0N";  
const TABLE_NAME     = "QRCodes";

(async function () {
  const card = document.getElementById("view-card");
  const id = new URLSearchParams(location.search).get("id");
  if (!id) { card.innerHTML = "<p>Missing id.</p>"; return; }

  try {
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(TABLE_NAME)}/${id}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
    });
    if (!res.ok) throw new Error(await res.text());
    const rec = await res.json();
    const f = rec.fields;
    const pdf = f.PDF?.[0];
    const ppt = f.PPT?.[0];

    let html = `<h2>${f.Name || "Files"}</h2><div class="file-buttons">`;
    if (pdf) html += `<a class="pdf" href="${pdf.url}" target="_blank" rel="noopener">View / Download PDF</a>`;
    if (ppt) html += `<a class="ppt" href="${ppt.url}" target="_blank" rel="noopener">View / Download PPT</a>`;
    if (!pdf && !ppt) html += `<p>No files attached.</p>`;
    html += `</div>`;
    card.innerHTML = html;
  } catch (err) {
    card.innerHTML = `<p class="status err">${err.message}</p>`;
  }
})();
