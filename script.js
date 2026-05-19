/* ====== CONFIG: fill these in ====== */
const AIRTABLE_TOKEN = "patdDjF8LQNiHPbIv.ea6b727c91d93fd979616f6a36918f928b1ff1ae8b6d635639e16e0358aa4d56";   // Personal Access Token
const AIRTABLE_BASE  = "appV4lbFKyi2wKI0N";        // e.g. appXXXXXXXXXXXXXX
const TABLE_NAME     = "QRCodes";

/* Public URL where you host these files. MUST be http(s) and reachable
   from a phone (e.g. https://yourname.github.io/qr-portal/).
   Leave "" to auto-detect from the current page — but auto-detect only
   works if you opened this page over http(s), NOT file://. */
const BASE_URL = "";
/* ==================================== */

const API = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(TABLE_NAME)}`;
const HEADERS = { Authorization: `Bearer ${AIRTABLE_TOKEN}` };

/* ---- environment check ---- */
(function envCheck() {
  const banner = document.getElementById("env-warning");
  if (!banner) return;
  if (location.protocol === "file:" && !BASE_URL) {
    banner.textContent =
      "⚠️ You opened this file directly (file://). QR codes generated here will NOT open on phones. " +
      "Host these files on a web server (GitHub Pages, Netlify, etc.) or set BASE_URL in script.js.";
    banner.classList.remove("hidden");
  }
})();

function getViewBase() {
  if (BASE_URL) return BASE_URL.replace(/\/+$/, "") + "/";
  // auto-detect: strip index.html if present
  return location.href.replace(/index\.html?(\?.*)?$/, "").replace(/\?.*$/, "");
}

/* ---- helpers ---- */
function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function uploadAttachment(recordId, fieldName, file) {
  const b64 = await fileToBase64(file);
  const url = `https://content.airtable.com/v0/${AIRTABLE_BASE}/${recordId}/${encodeURIComponent(fieldName)}/uploadAttachment`;
  const res = await fetch(url, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({
      contentType: file.type || "application/octet-stream",
      filename: file.name,
      file: b64,
    }),
  });
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
  return res.json();
}

/* ---- create flow ---- */
document.getElementById("create-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const status = document.getElementById("form-status");
  const btn = document.getElementById("submit-btn");
  const title = document.getElementById("title").value.trim();
  const pdf = document.getElementById("pdf").files[0];
  const ppt = document.getElementById("ppt").files[0];

  if (!pdf && !ppt) {
    status.textContent = "Attach at least one file."; status.className = "status err"; return;
  }
  if ((pdf && pdf.size > 5 * 1024 * 1024) || (ppt && ppt.size > 5 * 1024 * 1024)) {
    status.textContent = "Each file must be 5 MB or less."; status.className = "status err"; return;
  }

  btn.disabled = true;
  status.textContent = "Creating record…"; status.className = "status";

  try {
    const createRes = await fetch(API, {
      method: "POST",
      headers: { ...HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { Name: title } }),
    });
    if (!createRes.ok) throw new Error(await createRes.text());
    const record = await createRes.json();

    if (pdf) { status.textContent = "Uploading PDF…"; await uploadAttachment(record.id, "PDF", pdf); }
    if (ppt) { status.textContent = "Uploading PPT…"; await uploadAttachment(record.id, "PPT", ppt); }

    status.textContent = "Created!"; status.className = "status ok";
    e.target.reset();
    loadList();
  } catch (err) {
    console.error(err);
    status.textContent = "Error: " + err.message; status.className = "status err";
  } finally {
    btn.disabled = false;
  }
});

/* ---- list flow ---- */
async function loadList() {
  const list = document.getElementById("list");
  list.innerHTML = "<p>Loading…</p>";
  try {
    const res = await fetch(`${API}?pageSize=100&sort[0][field]=CreatedAt&sort[0][direction]=desc`, { headers: HEADERS });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (!data.records.length) { list.innerHTML = "<p>No QR codes yet.</p>"; return; }
    list.innerHTML = "";
    data.records.forEach((rec) => {
      const f = rec.fields;
      const has = [];
      if (f.PDF?.length) has.push("PDF");
      if (f.PPT?.length) has.push("PPT");
      const div = document.createElement("div");
      div.className = "list-item";
      const safeTitle = (f.Name || "").replace(/"/g, "&quot;");
      div.innerHTML = `
        <div>
          <strong>${f.Name || "(untitled)"}</strong>
          <div class="badges">${has.map(t => `<span>${t}</span>`).join("")}</div>
          <div class="meta">${f.CreatedAt ? new Date(f.CreatedAt).toLocaleString() : ""}</div>
        </div>
        <div class="item-actions">
          <button data-id="${rec.id}" data-title="${safeTitle}" class="view-qr-btn">View QR</button>
          <button data-id="${rec.id}" data-title="${safeTitle}" class="delete-btn" onclick="deleteQR('${rec.id}', '${safeTitle}')">Delete</button>
        </div>
      `;
      list.appendChild(div);
    });
    list.querySelectorAll(".view-qr-btn").forEach(b =>
      b.addEventListener("click", () => showQR(b.dataset.id, b.dataset.title))
    );
  } catch (err) {
    list.innerHTML = `<p class="status err">${err.message}</p>`;
  }
}
document.getElementById("refresh-btn").addEventListener("click", loadList);

/* ---- QR modal ---- */
function showQR(id, title) {
  const url = `${getViewBase()}view.html?id=${id}`;
  document.getElementById("qr-title").textContent = title || "QR Code";
  const link = document.getElementById("qr-link");
  link.textContent = url; link.href = url;
  const canvas = document.getElementById("qr-canvas");
  canvas.innerHTML = "";
  // eslint-disable-next-line no-new, no-undef
  new QRCode(canvas, { text: url, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });
  document.getElementById("qr-modal").classList.remove("hidden");

  if (url.startsWith("file:")) {
    const warn = document.createElement("p");
    warn.className = "status err";
    warn.textContent = "This QR points to a file:// URL — phones cannot open it. Host the site or set BASE_URL.";
    canvas.appendChild(warn);
  }
}
function closeModal() { document.getElementById("qr-modal").classList.add("hidden"); }
function downloadQR() {
  const img = document.querySelector("#qr-canvas img") || document.querySelector("#qr-canvas canvas");
  if (!img) return;
  const src = img.tagName === "IMG" ? img.src : img.toDataURL();
  const a = document.createElement("a");
  a.href = src; a.download = "qr.png"; a.click();
}
window.closeModal = closeModal;
window.downloadQR = downloadQR;

async function deleteQR(id, title) {
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
  try {
    const res = await fetch(`${API}/${id}`, { method: "DELETE", headers: HEADERS });
    if (!res.ok) throw new Error(await res.text());
    loadList();
  } catch (err) {
    alert("Delete failed: " + err.message);
  }
}
window.deleteQR = deleteQR;

loadList();
