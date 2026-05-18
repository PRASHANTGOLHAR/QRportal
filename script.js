/* ====== CONFIG: fill these in ====== */
const AIRTABLE_TOKEN = "patdDjF8LQNiHPbIv.ea6b727c91d93fd979616f6a36918f928b1ff1ae8b6d635639e16e0358aa4d56";   // Personal Access Token
const AIRTABLE_BASE  = "appV4lbFKyi2wKI0N";        // e.g. appXXXXXXXXXXXXXX
const TABLE_NAME     = "QRCodes";
/* ==================================== */

const API = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${encodeURIComponent(TABLE_NAME)}`;
const HEADERS = { Authorization: `Bearer ${AIRTABLE_TOKEN}` };

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
    status.textContent = "Attach at least one file.";
    status.className = "status err";
    return;
  }
  if ((pdf && pdf.size > 5 * 1024 * 1024) || (ppt && ppt.size > 5 * 1024 * 1024)) {
    status.textContent = "Each file must be 5 MB or less.";
    status.className = "status err";
    return;
  }

  btn.disabled = true;
  status.textContent = "Creating record…";
  status.className = "status";

  try {
    // 1. create record with just the name
    const createRes = await fetch(API, {
      method: "POST",
      headers: { ...HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ fields: { Name: title } }),
    });
    if (!createRes.ok) throw new Error(await createRes.text());
    const record = await createRes.json();

    // 2. upload attachments
    if (pdf) { status.textContent = "Uploading PDF…"; await uploadAttachment(record.id, "PDF", pdf); }
    if (ppt) { status.textContent = "Uploading PPT…"; await uploadAttachment(record.id, "PPT", ppt); }

    status.textContent = "Created!";
    status.className = "status ok";
    e.target.reset();
    loadList();
  } catch (err) {
    console.error(err);
    status.textContent = "Error: " + err.message;
    status.className = "status err";
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
      div.innerHTML = `
        <div>
          <strong>${f.Name || "(untitled)"}</strong>
          <div class="badges">${has.map(t => `<span>${t}</span>`).join("")}</div>
          <div class="meta">${f.CreatedAt ? new Date(f.CreatedAt).toLocaleString() : ""}</div>
        </div>
        <button onclick="showQR('${rec.id}', ${JSON.stringify(f.Name || "").replace(/"/g,'&quot;')})">View QR</button>
      `;
      list.appendChild(div);
    });
  } catch (err) {
    list.innerHTML = `<p class="status err">${err.message}</p>`;
  }
}
document.getElementById("refresh-btn").addEventListener("click", loadList);

/* ---- QR modal ---- */
let currentQR;
function showQR(id, title) {
  const url = `${location.origin}${location.pathname.replace(/index\.html?$/, "")}view.html?id=${id}`;
  document.getElementById("qr-title").textContent = title || "QR Code";
  const link = document.getElementById("qr-link");
  link.textContent = url; link.href = url;
  const canvas = document.getElementById("qr-canvas");
  canvas.innerHTML = "";
  currentQR = new QRCode(canvas, { text: url, width: 220, height: 220 });
  document.getElementById("qr-modal").classList.remove("hidden");
}
function closeModal() { document.getElementById("qr-modal").classList.add("hidden"); }
function downloadQR() {
  const img = document.querySelector("#qr-canvas img") || document.querySelector("#qr-canvas canvas");
  if (!img) return;
  const src = img.tagName === "IMG" ? img.src : img.toDataURL();
  const a = document.createElement("a");
  a.href = src; a.download = "qr.png"; a.click();
}

loadList();
