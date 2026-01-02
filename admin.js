const params = new URLSearchParams(location.search);
const slug = params.get("slug");
const key = params.get("key");

const statusEl = document.getElementById("status");
const categoryEl = document.getElementById("category");
const itemsEl = document.getElementById("items");

if (!slug || !key) {
  statusEl.textContent = "Missing slug or key in URL";
  throw new Error("Missing slug/key");
}

// Replace YOUR_PROJECT_REF after you deploy:
const FUNCTION_URL = "https://qoaxoenapckvltuudmjv.supabase.co/functions/v1/admin-update-menu";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvYXhvZW5hcGNrdmx0dXVkbWp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzkzNjQsImV4cCI6MjA4Mjk1NTM2NH0.5J0GzyCELNxAuQ5Rap7SZJWkUQpKaIu3aDrjG9FNrKE";


async function callFn(action, payload) {
  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ slug, key, action, payload }),
  });

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) throw new Error(json.error || text || "Request failed");
  return json;
}


let categories = [];
let items = [];

function render() {
  categoryEl.innerHTML = categories
    .map(c => `<option value="${c.id}">${c.name}</option>`)
    .join("");

  const catName = (id) => categories.find(c => c.id === id)?.name || "-";

  itemsEl.innerHTML = items.map(i => `
    <tr>
      <td><input data-id="${i.id}" data-field="name" value="${i.name ?? ""}"></td>
      <td><input data-id="${i.id}" data-field="price" type="number" step="0.01" value="${i.price ?? ""}"></td>
      <td>${catName(i.category_id)}</td>
      <td>
        <select data-id="${i.id}" data-field="available">
          <option value="true" ${i.available ? "selected":""}>true</option>
          <option value="false" ${!i.available ? "selected":""}>false</option>
        </select>
      </td>
      <td>
        <button data-save="${i.id}">Save</button>
        <button class="danger" data-del="${i.id}">Delete</button>
      </td>
    </tr>
  `).join("");
}

async function refresh() {
  statusEl.textContent = "Loading...";
  const out = await callFn("list");
  categories = out.categories || [];
  items = out.items || [];
  statusEl.textContent = "Ready ✅";
  render();
}

document.getElementById("add").onclick = async () => {
  const name = document.getElementById("name").value.trim();
  const price = Number(document.getElementById("price").value || 0);
  const category_id = categoryEl.value;

  if (!name) return alert("Name required");

  await callFn("add_item", { name, price, category_id });
  document.getElementById("name").value = "";
  document.getElementById("price").value = "";
  await refresh();
};

itemsEl.addEventListener("click", async (e) => {
  const saveId = e.target.getAttribute("data-save");
  const delId = e.target.getAttribute("data-del");

  if (saveId) {
    const rowInputs = itemsEl.querySelectorAll(`[data-id="${saveId}"]`);
    const payload = { id: saveId };

    rowInputs.forEach(el => {
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
    await callFn("delete_item", { id: delId });
    await refresh();
  }
});

refresh();
    