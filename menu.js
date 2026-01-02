const SUPABASE_URL = "https://qoaxoenapckvltuudmjv.supabase.co";
const SUPABASE_KEY = "sb_publishable_pwiEDNlv7Rn39PBzEIkOQQ_EeHkfaZF";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const slug = new URLSearchParams(location.search).get("slug");
if (!slug) {
  document.getElementById("restName").textContent = "Menu";
  document.getElementById("restSub").textContent =
    "Scan the restaurant QR code";
  document.getElementById("book").innerHTML = `
    <div class="page cover">
      <div class="title">QR Menu</div>
      <div class="subtitle">Open this link with a restaurant code</div>
      <div class="chip">
  Please scan the QR code at your table
</div>

    </div>
  `;
  // hide arrows
  ["prevBtn", "nextBtn", "pageIndicator"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  throw new Error("Missing slug");
}

const bookEl = document.getElementById("book");
const restNameEl = document.getElementById("restName");
const restSubEl = document.getElementById("restSub");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const pageIndicator = document.getElementById("pageIndicator");

let pages = [];
let pageIndex = 0;

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

function setIndicator() {
  // dots indicator
  pageIndicator.innerHTML = pages
    .map(
      (_, i) =>
        `<span style="
      display:inline-block;width:6px;height:6px;border-radius:50%;
      margin:0 3px;background:${i === pageIndex ? "#111" : "#cfc7b9"}"></span>`
    )
    .join("");

  prevBtn.disabled = pageIndex <= 0;
  nextBtn.disabled = pageIndex >= pages.length - 1;
}

function showPage(i) {
  if (!pages.length) return;
  pageIndex = Math.max(0, Math.min(i, pages.length - 1));
  pages.forEach((p, idx) => p.classList.toggle("is-hidden", idx !== pageIndex));
  setIndicator();
}

function buildCover(restaurant) {
  const page = document.createElement("div");
  page.className = "page cover is-hidden";
  page.innerHTML = `
    <div class="title">${escapeHtml(restaurant.name || "Menu")}</div>
    <div class="subtitle">Welcome — swipe or use arrows to browse</div>
    <div class="chip">Today’s Menu</div>
  `;
  return page;
}

function buildCategoryPage(category, items) {
  const page = document.createElement("div");
  page.className = "page is-hidden";

  const list = items
    .map((it) => {
      const desc = (it.description || "").trim();
      return `
      <div class="item">
        <div class="left">
          <div class="name">${escapeHtml(it.name)}</div>
       ${
         it.description
           ? `<div class="desc">${escapeHtml(it.description)}</div>`
           : ""
       }

        </div>
        <div class="right">
          <div class="dots"></div>
          <div class="price">€${Number(it.price ?? 0).toFixed(2)}</div>
        </div>
      </div>
    `;
    })
    .join("");

  page.innerHTML = `
    <div class="page-title">${escapeHtml(category.name)}</div>
    ${list || `<div class="footer">No items in this category.</div>`}
    <div class="footer">Swipe or use arrows</div>
  `;
  return page;
}

async function loadMenu() {
  try {
    const { data: restaurant, error: rErr } = await sb
      .from("restaurants")
      .select("*")
      .eq("slug", slug)
      .single();

    if (rErr || !restaurant) {
      document.body.innerHTML = "Restaurant not found";
      return;
    }

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
    pages = [];

    // Cover first
    const cover = buildCover(restaurant);
    bookEl.appendChild(cover);
    pages.push(cover);

    // Categories after
    (categories || []).forEach((cat) => {
      const catItems = (items || []).filter((i) => i.category_id === cat.id);
      const page = buildCategoryPage(cat, catItems);
      bookEl.appendChild(page);
      pages.push(page);
    });

    if (pages.length === 1) {
      // only cover exists
      const p = document.createElement("div");
      p.className = "page is-hidden";
      p.innerHTML = `<div class="page-title">Menu</div><div class="footer">No categories yet.</div>`;
      bookEl.appendChild(p);
      pages.push(p);
    }

    showPage(0);
  } catch (e) {
    console.error(e);
    document.body.innerHTML = "Error loading menu. Check console.";
  }
}

prevBtn.addEventListener("click", () => showPage(pageIndex - 1));
nextBtn.addEventListener("click", () => showPage(pageIndex + 1));

// Swipe
let startX = null;
bookEl.addEventListener(
  "touchstart",
  (e) => {
    startX = e.touches[0].clientX;
  },
  { passive: true }
);
bookEl.addEventListener("touchend", (e) => {
  if (startX == null) return;
  const dx = e.changedTouches[0].clientX - startX;
  startX = null;
  if (Math.abs(dx) < 50) return;
  if (dx < 0) showPage(pageIndex + 1);
  else showPage(pageIndex - 1);
});

loadMenu();

setTimeout(() => {
  document.getElementById("book")?.scrollIntoView({ behavior: "smooth" });
}, 200);
