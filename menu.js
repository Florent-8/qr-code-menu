const SUPABASE_URL = "https://qoaxoenapckvltuudmjv.supabase.co";
const SUPABASE_KEY = "sb_publishable_pwiEDNlv7Rn39PBzEIkOQQ_EeHkfaZF";

const sb = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const slug = new URLSearchParams(location.search).get("slug") || "";
if (!slug) {
  document.body.innerHTML = "Missing slug. Use ?slug=pizza-roma";
  throw new Error("Missing slug");
}

const bookEl = document.getElementById("book");
const restNameEl = document.getElementById("restName");
const restSubEl = document.getElementById("restSub");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageIndicator = document.getElementById("pageIndicator");

// small status line
const statusLine = document.createElement("div");
statusLine.style.margin = "8px 0 14px";
statusLine.style.color = "#6b7280";
statusLine.textContent = "Loading menu…";
document.querySelector(".topbar")?.after(statusLine);

let pages = [];
let pageIndex = 0;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}

function setIndicator() {
  pageIndicator.innerHTML = pages.map((_, i) =>
  `<span style="
    display:inline-block;
    width:6px;height:6px;
    border-radius:50%;
    margin:0 3px;
    background:${i===pageIndex?'#111':'#ccc'}"></span>`
).join("");
  prevBtn.disabled = pageIndex <= 0;
  nextBtn.disabled = pageIndex >= pages.length - 1;
}

function showPage(i) {
  if (!pages.length) return;
  pageIndex = Math.max(0, Math.min(i, pages.length - 1));
  pages.forEach((p, idx) => p.classList.toggle("is-hidden", idx !== pageIndex));
  setIndicator();
}

function buildPage(category, items) {
  const page = document.createElement("div");
  page.className = "page is-hidden";

  const list = items.map(it => {
    const desc = (it.description || "").trim();
    return `
      <div class="item">
        <div class="left">
          <div class="name">${escapeHtml(it.name)}</div>
          ${desc ? `<div class="desc">${escapeHtml(desc)}</div>` : ""}
        </div>
        <div class="price">$ ${Number(it.price ?? 0).toFixed(2)}</div>
      </div>
    `;
  }).join("");

  page.innerHTML = `
    <div class="page-title">${escapeHtml(category.name)}</div>
    ${list || `<div class="footer">No items in this category.</div>`}
    <div class="footer">Swipe or use arrows</div>
  `;
  return page;
}

async function loadMenu() {
  try {
    console.log("Loading menu for slug:", slug);

    const { data: restaurant, error: rErr } = await sb
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .single();

    if (rErr) throw rErr;
    if (!restaurant) throw new Error("Restaurant not found");

    restNameEl.textContent = restaurant.name || "Menu";
    restSubEl.textContent = `/${restaurant.slug}`;

    const { data: categories, error: cErr } = await sb
      .from("categories")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("order_index");

    if (cErr) throw cErr;

    const { data: items, error: iErr } = await sb
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("available", true);

    if (iErr) throw iErr;

    bookEl.innerHTML = "";
    pages = (categories || []).map(cat => {
      const catItems = (items || []).filter(i => i.category_id === cat.id);
      const page = buildPage(cat, catItems);
      bookEl.appendChild(page);
      return page;
    });

    if (!pages.length) {
      const p = document.createElement("div");
      p.className = "page";
      p.innerHTML = `<div class="page-title">Menu</div><div class="footer">No categories yet.</div>`;
      bookEl.appendChild(p);
      pages = [p];
    }

    statusLine.textContent = "Ready ✅";
    showPage(0);
  } catch (e) {
    console.error(e);
    statusLine.textContent = "Error: " + (e?.message || e);
    bookEl.innerHTML = `<div class="page"><div class="page-title">Error</div><div class="footer">${escapeHtml(e?.message || String(e))}</div></div>`;
  }
}

prevBtn.addEventListener("click", () => showPage(pageIndex - 1));
nextBtn.addEventListener("click", () => showPage(pageIndex + 1));

// Swipe
let startX = null;
bookEl.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
bookEl.addEventListener("touchend", (e) => {
  if (startX == null) return;
  const dx = e.changedTouches[0].clientX - startX;
  startX = null;
  if (Math.abs(dx) < 50) return;
  if (dx < 0) showPage(pageIndex + 1);
  else showPage(pageIndex - 1);
});

loadMenu();