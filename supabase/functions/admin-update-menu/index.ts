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

// ✅ Your project function URL
const FUNCTION_URL =
  "https://qoaxoenapckvltuudmjv.supabase.co/functions/v1/admin-update-menu";

// ✅ IMPORTANT: add your ANON key here (same one from menu.js)
const SUPABASE_ANON_KEY = "sb_publishable_pwiEDNlv7Rn39PBzEIkOQQ_EeHkfaZF";

async function callFn(action, payload) {
  const body = { slug, key, action, payload };

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // ✅ These often are REQUIRED (JWT verify / gateway)
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text(); // read raw for better debugging
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${json.error || text}`);
  }

  return json;
}

let categories = [];
let items = [];

async function refresh() {
  statusEl.textContent = "Loading...";
  try {
    const out = await callFn("list");
    categories = out.categories || [];
    items = out.items || [];
    statusEl.textContent = "Ready ✅";
    render();
  } catch (e) {
    console.error(e);
    statusEl.textContent = "Error: " + e.message;
  }
}
