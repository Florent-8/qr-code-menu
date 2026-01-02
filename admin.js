const params = new URLSearchParams(location.search);
const slug = params.get("slug");
const key = params.get("key");

// Elements (premium admin.html)
const categoryEl = document.getElementById("category");
const itemsEl = document.getElementById("items");
const subtitleEl = document.getElementById("subtitle");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const countEl = document.getElementById("count");

if (!slug || !key) {
  if (statusText) statusText.textContent = "Missing slug or key in URL";
  throw new Error("Missing slug/key");
}

const FUNCTION_URL =
  "https://qoaxoenapckvltuudmjv.supabase.co/functions/v1/admin-update-menu";

// Use the same anon key you use in menu.js
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvYXhvZW5hcGNrdmx0dXVkbWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzkzNjQsImV4cCI6MjA4Mjk1NTM2NH0.5J0GzyCELNxAuQ5Rap7SZJWkUQpKaIu3aDrjG9FNrKE";

// Status helper (matches CSS classes .dot, .dot.ok, .dot.err)
function setStatus(type, text) {
  if (statusText) statusText.textContent = text;
  if (!statusDot) return;

  statusDot.className = "dot";
  if (type === "ok") statusDot.classList.add("ok");
  if (type === "err") statusDot.classList.add("err");
}



// Call Edge Function (requires apikey + Authorization)
async function callFn(action, payload) {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ slug, key, action, payload }),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!res.ok) throw new Error(json.error || text || `HTTP ${res.status}`);
  return json;
}

let categories = [];
let items = [];

function render() {
  // Category dropdown
  categoryEl.innerHTML = categories
    .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
    .join("");

  const catName = (id) => categories.find((c) => c.id === id)?.name || "-";

  itemsEl.innerHTML = items
    .map(
      (i) => `
    <tr>
      <td>
        <input data-id="${i.id}" data-field="name" value="${escapeAttr(
        i.name ?? ""
      )}">
        <input data-id="${i.id}" data-field="description"
         placeholder="Description"
         value="${i.description ?? ""}"
         style="margin-top:6px">
      </td>

      <td>
        <input class="small" data-id="${
          i.id
        }" data-field="price" type="number" step="0.01"
               value="${i.price ?? ""}">
      </td>

      <td>
        <span style="color:#6b7280;font-size:13px">${escapeHtml(
          catName(i.category_id)
        )}</span>
      </td>

      <td>
        <select data-id="${i.id}" data-field="available">
          <option value="true" ${i.available ? "selected" : ""}>true</option>
          <option value="false" ${!i.available ? "selected" : ""}>false</option>
        </select>
      </td>

      <td>
        <div class="actions">
          <button class="ghost" data-save="${i.id}">Save</button>
          <button class="danger" data-del="${i.id}">Delete</button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
}

async function refresh() {
  setStatus("loading", "Loading…");
  try {
    const out = await callFn("list");
    categories = out.categories || [];
    items = out.items || [];

    setStatus("ok", "Ready");
    if (countEl) countEl.textContent = `${items.length} item(s)`;
    if (subtitleEl) subtitleEl.textContent = `/${slug}`;

    render();
  } catch (e) {
    console.error(e);
    setStatus("err", "Error");
    if (countEl) countEl.textContent = "";
    if (subtitleEl) subtitleEl.textContent = e.message || "Request failed";
  }
}

// Add item
document.getElementById("add").onclick = async () => {
  const name = document.getElementById("name").value.trim();
  const description = document.getElementById("desc").value.trim();
  const price = Number(document.getElementById("price").value || 0);
  const category_id = categoryEl.value;

  if (!name) return alert("Name required");

  setStatus("loading", "Saving…");
  await callFn("add_item", { name, description, price, category_id });

  document.getElementById("name").value = "";
  document.getElementById("price").value = "";
  document.getElementById("desc").value = "";

  await refresh();
};

// Save/Delete
itemsEl.addEventListener("click", async (e) => {
  const saveId = e.target.getAttribute("data-save");
  const delId = e.target.getAttribute("data-del");

  if (saveId) {
    setStatus("loading", "Saving…");

    const rowInputs = itemsEl.querySelectorAll(`[data-id="${saveId}"]`);
    const payload = { id: saveId };

    rowInputs.forEach((el) => {
      const field = el.getAttribute("data-field");
      let v = el.value;
      if (field === "price") v = Number(v || 0);
      if (field === "available") v = v === "true";
      payload[field] = v;
    });

    await callFn("update_item", payload);
    await refresh();
  }

  if (delId) {
    if (!confirm("Delete item?")) return;
    setStatus("loading", "Deleting…");
    await callFn("delete_item", { id: delId });
    await refresh();
  }
});

// small helpers
function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
  );
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

refresh();
