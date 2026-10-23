
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const LEVELS = ["SD", "SMP", "SMA", "SMK", "University"];
const CATEGORIES = ["Uniforms", "Books", "Stationery", "Bags", "Other"];

const sampleProducts = [
  {id:1,name:"White School Shirt",category:"Uniforms",level:"SMA",price:35000,condition:"Very good",seller:"Nadia",grade:"Grade 11",desc:"Clean white uniform shirt, still in good condition.",art:"WHITE<br>SHIRT",color:"#dfe7d9"},
  {id:2,name:"Introduction to Biology",category:"Books",level:"SMA",price:28000,condition:"Good",seller:"Raka",grade:"Grade 10",desc:"Biology textbook with some notes inside.",art:"BIOLOGY<br>NOTES",color:"#e9e1d8"},
  {id:3,name:"Everyday Canvas Tote",category:"Bags",level:"University",price:45000,condition:"Like new",seller:"Mika",grade:"Year 1",desc:"Canvas tote bag, spacious and clean.",art:"DAILY<br>TOTE",color:"#e2ebf1"},
  {id:4,name:"Pastel Highlighters",category:"Stationery",level:"SMP",price:12000,condition:"Very good",seller:"Alya",grade:"Grade 8",desc:"Set of pastel highlighters. All working.",art:"COLOR<br>STUDY",color:"#f0df8b"},
  {id:5,name:"Math Practice Book",category:"Books",level:"SD",price:15000,condition:"Good",seller:"Dina",grade:"Grade 6",desc:"Practice book for elementary school maths.",art:"MATH<br>CLUB",color:"#e2ebf1"},
  {id:6,name:"Workshop Lab Coat",category:"Uniforms",level:"SMK",price:50000,condition:"Good",seller:"Fajar",grade:"Grade 12",desc:"Lab coat, size M. No major stains.",art:"LAB<br>COAT",color:"#dfe7d9"},
  {id:7,name:"Basic Statistics Book",category:"Books",level:"University",price:40000,condition:"Very good",seller:"Tara",grade:"Year 2",desc:"Statistics textbook with a few highlighted pages.",art:"STATS<br>101",color:"#e9e1d8"},
  {id:8,name:"Pencil Case",category:"Stationery",level:"SMP",price:10000,condition:"Good",seller:"Nina",grade:"Grade 9",desc:"Simple pencil case with plenty of space.",art:"LITTLE<br>THINGS",color:"#f0df8b"}
];

let products = [...sampleProducts];
let currentUser = null;
let activeRole = "buyer";
let currentPage = "landing";
let authMode = "login";
let cart = [];
let paidItems = [];
let chats = [];
let selectedPhoto = "";
let currentDetailId = null;
let activeLevel = "All";
let toastTimer;

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    notify("Storage is full. Try using a smaller photo.");
  }
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  })[c]);
}

function money(n) {
  return "Rp" + Number(n).toLocaleString("id-ID");
}

function notify(message) {
  const t = $("#toast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

function persistAccount() {
  save("ss_users", read("ss_users", []));
  if (currentUser) {
    save("ss_session", {
      username: currentUser.username,
      role: activeRole
    });
  }
}

function setPage(name) {
  if (!currentUser && name !== "landing") {
    openAuth("login");
    return;
  }

  currentPage = name;

  $$(".page").forEach(p => p.classList.add("hidden"));

  const target = $("#" + name + "Page");
  if (target) target.classList.remove("hidden");

  $$(".nav-link").forEach(b =>
    b.classList.toggle("active", b.dataset.page === name)
  );

  if (name === "home") renderProducts();
  if (name === "cart") renderCart();
  if (name === "inbox") renderInbox();
  if (name === "level") loadProfile();

  if (name === "sell" && activeRole !== "seller") {
    notify("Switch to Seller mode to list items.");
    setPage("home");
    return;
  }

  window.scrollTo({top: 0, behavior: "smooth"});
}

function renderAccount() {
  const logged = !!currentUser;

  document.body.classList.toggle("logged-out", !logged);
  $("#navigation").classList.toggle("hidden", !logged);
  $("#accountLinks").classList.toggle("hidden", logged);
  $("#userTools").classList.toggle("hidden", !logged);
  $("#switchRole").textContent = activeRole.toUpperCase() + " ↻";

  $$(".seller-only").forEach(b =>
    b.classList.toggle("hidden", activeRole !== "seller")
  );

  $("#cartCount").textContent = cart.length;
  $("#inboxCount").textContent = chats.length;
}

function openAuth(mode) {
  authMode = mode;

  const signup = mode === "signup";

  $("#authTitle").innerHTML = signup
    ? "Join the <em>shelf.</em>"
    : "Come on <em>in.</em>";

  $("#authIntro").textContent = signup
    ? "Make an account and find your community."
    : "Your next good find is waiting.";

  $("#nameWrap").classList.toggle("hidden", !signup);
  $("#roleWrap").classList.toggle("hidden", !signup);
  $("#authName").required = signup;

  $("#authSubmit").textContent = signup
    ? "CREATE ACCOUNT ↗"
    : "LOGIN ↗";

  $("#authSwitch").innerHTML = signup
    ? 'Already have an account? <button type="button" id="switchToLogin">Login ↗</button>'
    : 'New here? <button type="button" id="switchToSignup">Make an account ↗</button>';

  $("#authModal").classList.remove("hidden");

  setTimeout(() => $("#authUsername").focus(), 50);
}

function closeAuth() {
  $("#authModal").classList.add("hidden");
  $("#authForm").reset();
}

function getUsers() {
  return read("ss_users", []);
}

function updateCurrentUser() {
  const users = getUsers();
  const idx = users.findIndex(u => u.username === currentUser.username);

  if (idx >= 0) {
    users[idx] = {...users[idx], ...currentUser, role: activeRole};
    save("ss_users", users);
  }

  persistAccount();
}

function loadProfile() {
  if (!currentUser) return;

  $("#profileLevel").value = currentUser.level || "SMA";
  $("#profileGrade").value = currentUser.grade || "";
  $("#profileSemester").value = currentUser.semester || "";
}

function renderProducts() {
  const query = ($("#searchInput").value || "").toLowerCase().trim();
  const category = $("#categoryFilter").value;
  const level = $("#levelFilter").value;

  const filtered = products.filter(p => {
    const matchesQuery = [p.name, p.category, p.level, p.seller, p.desc]
      .join(" ").toLowerCase().includes(query);

    return matchesQuery &&
      (category === "All" || p.category === category) &&
      (level === "All" || p.level === level) &&
      (activeLevel === "All" || p.level === activeLevel);
  });

  $("#resultCount").textContent = `${filtered.length} ITEMS`;
  $("#emptyProducts").classList.toggle("hidden", filtered.length > 0);

  $("#productGrid").innerHTML = filtered.map(p => `
    <article class="product-card">
      <div class="product-photo" data-detail="${p.id}" role="button" tabindex="0">
        ${p.image
          ? `<img src="${p.image}" alt="${escapeHTML(p.name)}">`
          : `<div class="product-art">${p.art || escapeHTML(p.category)}</div>`}
        <span class="product-tag">${escapeHTML(p.condition)}</span>
        <button class="save-item" data-add="${p.id}" aria-label="Add to cart">＋</button>
      </div>
      <div class="product-info">
        <div class="product-category">${escapeHTML(p.category)} / ${escapeHTML(p.level)}</div>
        <h3 class="product-name" data-detail="${p.id}">${escapeHTML(p.name)}</h3>
        <div class="product-meta">Listed by ${escapeHTML(p.seller)}</div>
        <div class="product-bottom">
          <span class="product-price">${money(p.price)}</span>
          <button class="mini-add" data-add="${p.id}">ADD +</button>
        </div>
      </div>
    </article>
  `).join("");
}

function addToCart(id) {
  const product = products.find(p => p.id === Number(id));
  if (!product) return;

  if (cart.some(p => p.id === product.id)) {
    notify("This item is already in your cart.");
    return;
  }

  cart.push(product);
  save("ss_cart", cart);
  renderAccount();
  notify("Added to your cart!");
}

function removeFromCart(id) {
  cart = cart.filter(p => p.id !== Number(id));
  save("ss_cart", cart);
  renderAccount();
  renderCart();
}

function renderCart() {
  if (!cart.length) {
    $("#cartItems").innerHTML =
      '<div class="empty-panel">Your cart is empty.<br>Go find something good on the shelf.</div>';
    $("#cartSummary").innerHTML = "";
    return;
  }

  $("#cartItems").innerHTML = cart.map(p => `
    <div class="list-row">
      <div class="list-thumb">
        ${p.image
          ? `<img src="${p.image}" alt="">`
          : `<span>${escapeHTML(p.category)}</span>`}
      </div>
      <div class="list-details">
        <strong>${escapeHTML(p.name)}</strong>
        <p>${escapeHTML(p.level)} · ${escapeHTML(p.condition)}</p>
        <strong>${money(p.price)}</strong>
      </div>
      <button class="row-action" data-remove="${p.id}">REMOVE</button>
    </div>
  `).join("");

  const total = cart.reduce((sum, p) => sum + Number(p.price), 0);

  $("#cartSummary").innerHTML = `
    <strong>Total: ${money(total)}</strong><br>
    <button class="solid-button" id="checkout">CHECK OUT ↗</button>
  `;
}

function renderInbox() {
  if (!chats.length) {
    $("#inboxContent").innerHTML =
      '<div class="empty-panel">Your inbox is quiet for now.<br>After checkout, your seller conversations will appear here.</div>';
    return;
  }

  $("#inboxContent").innerHTML = chats.map(c => `
    <div class="list-row">
      <div class="list-thumb">✳</div>
      <div class="list-details">
        <strong>${escapeHTML(c.product)}</strong>
        <p>Seller: ${escapeHTML(c.seller)} · Order confirmed</p>
      </div>
      <button class="row-action" data-chat="${c.id}">OPEN CHAT</button>
    </div>
  `).join("");
}

/* Inline offer box styling — keeps the existing website design. */
function ensureOfferStyles() {
  if (document.getElementById("offerStyles")) return;

  const style = document.createElement("style");
  style.id = "offerStyles";

  style.textContent = `
    .offer-box {
      max-width: 420px;
      margin-top: 16px;
      padding: 18px;
      border: 1px solid var(--line);
      background: #fffdf7;
    }

    .offer-box label {
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: var(--blue);
      font: 9px "DM Mono", monospace;
      letter-spacing: .04em;
    }

    .offer-box input {
      width: 100%;
      padding: 12px;
      border: 1px solid #d3d6ce;
      background: var(--paper);
      color: var(--ink);
      font: 12px "DM Sans", sans-serif;
      box-sizing: border-box;
    }

    .offer-box-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
      margin-top: 12px;
    }

    .offer-help {
      margin: 9px 0 0;
      color: var(--muted);
      font: 10px/1.6 "DM Sans", sans-serif;
    }
  `;

  document.head.appendChild(style);
}

function showDetail(id) {
  ensureOfferStyles();

  const p = products.find(x => x.id === Number(id));
  if (!p) return;

  currentDetailId = p.id;

  $("#productDetail").innerHTML = `
    <div class="detail-layout">
      <div class="detail-image">
        ${p.image
          ? `<img src="${p.image}" alt="${escapeHTML(p.name)}">`
          : `<div class="product-art">${p.art || escapeHTML(p.category)}</div>`}
      </div>

      <div class="detail-copy">
        <p class="eyebrow">${escapeHTML(p.category)} / ${escapeHTML(p.level)}</p>
        <h1>${escapeHTML(p.name)}</h1>
        <div class="detail-price">${money(p.price)}</div>

        <p>
          Condition: ${escapeHTML(p.condition)}<br>
          School level: ${escapeHTML(p.level)}<br>
          Grade: ${escapeHTML(p.grade || "Not specified")}<br>
          Seller: ${escapeHTML(p.seller)}
        </p>

        <p>${escapeHTML(p.desc || "No description provided.")}</p>

        <div class="detail-actions">
          <button class="solid-button" type="button" data-add="${p.id}">
            ADD TO CART ↗
          </button>

          <button class="row-action" type="button" id="makeOffer">
            MAKE AN OFFER
          </button>
        </div>

        <form class="offer-box hidden" id="offerBox">
          <label for="offerAmount">
            YOUR OFFER (RP)
            <input
              id="offerAmount"
              name="offerAmount"
              type="number"
              min="1000"
              step="1000"
              required
              placeholder="Enter your price"
              value="${p.price}"
            >
          </label>

          <div class="offer-box-actions">
            <button class="solid-button" type="submit">SEND OFFER ↗</button>
            <button class="row-action" type="button" id="cancelOffer">CANCEL</button>
          </div>

          <p class="offer-help">
            Your offer is a proposal only. The seller must approve it.
          </p>
        </form>

        <p class="product-meta">
          Demo marketplace: contact and payment are not connected to a real service.
        </p>
      </div>
    </div>
  `;

  setPage("detail");
}

function loadCustomProducts() {
  const custom = read("ss_custom_products", []);
  products = [...custom, ...sampleProducts];
}

function loadSession() {
  const session = read("ss_session", null);
  const users = getUsers();

  if (session) {
    const user = users.find(u => u.username === session.username);

    if (user) {
      currentUser = user;
      activeRole = session.role || user.role || "buyer";
      cart = read("ss_cart_" + currentUser.username, []);
      chats = read("ss_chats_" + currentUser.username, []);
      return;
    }
  }

  currentUser = null;
  activeRole = "buyer";
}

function persistUserData() {
  if (!currentUser) return;

  save("ss_cart_" + currentUser.username, cart);
  save("ss_chats_" + currentUser.username, chats);
}

function checkout() {
  if (!cart.length) return;

  const purchased = [...cart];

  purchased.forEach(p => {
    if (p.seller === currentUser.username || p.seller === currentUser.name) {
      return;
    }

    if (!chats.some(c => c.id === p.id)) {
      chats.push({
        id: p.id,
        product: p.name,
        seller: p.seller,
        messages: []
      });
    }
  });

  paidItems.push(...purchased.map(p => p.id));
  cart = [];

  persistUserData();
  save("ss_paid_" + currentUser.username, paidItems);

  renderAccount();
  notify("Demo checkout complete. Inbox unlocked!");
  setPage("inbox");
}

// Navigation.
$$("[data-page]").forEach(button => {
  button.addEventListener("click", () => {
    activeLevel = "All";
    setPage(button.dataset.page);
  });
});

$$("[data-back]").forEach(button => {
  button.addEventListener("click", () => setPage(button.dataset.back));
});

$("#brand").addEventListener("click", e => {
  e.preventDefault();
  if (currentUser) setPage("home");
});

$("#landingLogin").onclick = () => openAuth("login");
$("#landingSignup").onclick = () => openAuth("signup");
$("#headerLogin").onclick = () => openAuth("login");
$("#headerSignup").onclick = () => openAuth("signup");

$("#authSwitch").addEventListener("click", e => {
  if (e.target.id === "switchToSignup") openAuth("signup");
  if (e.target.id === "switchToLogin") openAuth("login");
});

$$("[data-close='auth']").forEach(el =>
  el.addEventListener("click", closeAuth)
);

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeAuth();
});

// Login and sign up.
$("#authForm").addEventListener("submit", e => {
  e.preventDefault();

  const username = $("#authUsername").value.trim().toLowerCase();
  const password = $("#authPassword").value;
  let users = getUsers();

  if (authMode === "signup") {
    if (users.some(u => u.username === username)) {
      notify("This username already exists. Please log in.");
      return;
    }

    currentUser = {
      name: $("#authName").value.trim(),
      username,
      password,
      role: $("#authRole").value,
      level: "SMA",
      grade: "",
      semester: ""
    };

    activeRole = currentUser.role;
    users.push(currentUser);
    save("ss_users", users);
  } else {
    const found = users.find(
      u => u.username === username && u.password === password
    );

    if (!found) {
      notify("Account not found or password is incorrect.");
      return;
    }

    currentUser = found;
    activeRole = found.role || "buyer";
  }

  cart = read("ss_cart_" + currentUser.username, []);
  chats = read("ss_chats_" + currentUser.username, []);
  paidItems = read("ss_paid_" + currentUser.username, []);

  persistAccount();
  renderAccount();
  closeAuth();
  setPage("home");
  notify("Welcome to SeniorShelf!");
});

// Switch buyer/seller mode.
$("#switchRole").addEventListener("click", () => {
  if (!currentUser) return;

  activeRole = activeRole === "buyer" ? "seller" : "buyer";
  currentUser.role = activeRole;

  updateCurrentUser();
  renderAccount();

  notify("Switched to " + activeRole.toUpperCase() + " mode.");

  setPage(activeRole === "seller" ? "sell" : "home");
});

// Logout.
$("#logout").addEventListener("click", () => {
  persistUserData();
  localStorage.removeItem("ss_session");

  currentUser = null;
  cart = [];
  chats = [];
  activeRole = "buyer";

  renderAccount();
  setPage("landing");
  notify("Logged out.");
});

// Search and filters.
$("#searchInput").addEventListener("input", renderProducts);
$("#categoryFilter").addEventListener("change", renderProducts);

$("#levelFilter").addEventListener("change", () => {
  activeLevel = "All";
  renderProducts();
});

// Product grid: open detail or add to cart.
$("#productGrid").addEventListener("click", e => {
  const add = e.target.closest("[data-add]");
  const detail = e.target.closest("[data-detail]");

  if (add) {
    e.stopPropagation();
    addToCart(add.dataset.add);
  } else if (detail) {
    showDetail(detail.dataset.detail);
  }
});

$("#productGrid").addEventListener("keydown", e => {
  if (
    (e.key === "Enter" || e.key === " ") &&
    e.target.matches("[data-detail]")
  ) {
    e.preventDefault();
    showDetail(e.target.dataset.detail);
  }
});

// Cart.
$("#cartItems").addEventListener("click", e => {
  const remove = e.target.closest("[data-remove]");
  if (remove) removeFromCart(remove.dataset.remove);
});

$("#cartSummary").addEventListener("click", e => {
  if (e.target.id === "checkout") checkout();
});

// Inbox.
$("#inboxContent").addEventListener("click", e => {
  const btn = e.target.closest("[data-chat]");
  if (!btn) return;

  const chat = chats.find(c => c.id === Number(btn.dataset.chat));

  if (chat) {
    notify("Chat with " + chat.seller + " — live messaging needs a backend.");
  }
});

// School level shortcuts.
$$("[data-level]").forEach(button => {
  button.addEventListener("click", () => {
    activeLevel = button.dataset.level;
    $("#levelFilter").value = activeLevel;
    $("#searchInput").value = "";
    setPage("home");
  });
});

// Save profile.
$("#saveProfile").addEventListener("click", () => {
  currentUser.level = $("#profileLevel").value;
  currentUser.grade = $("#profileGrade").value.trim();
  currentUser.semester = $("#profileSemester").value;

  updateCurrentUser();
  notify("School info saved!");
});

// Upload photo preview.
$("#itemPhoto").addEventListener("change", e => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    notify("Please select an image.");
    return;
  }

  if (file.size > 1200000) {
    notify("Please choose a photo under 1.2 MB for this demo.");
    e.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    selectedPhoto = reader.result;
    $("#photoPreview").innerHTML =
      `<img src="${selectedPhoto}" alt="Product preview">`;
  };

  reader.readAsDataURL(file);
});

// List a product.
$("#sellForm").addEventListener("submit", e => {
  e.preventDefault();

  if (!currentUser || activeRole !== "seller") {
    notify("Switch to Seller mode first.");
    return;
  }

  if (!selectedPhoto) {
    notify("Please add a product photo.");
    return;
  }

  const product = {
    id: Date.now(),
    name: $("#itemName").value.trim(),
    category: $("#itemCategory").value,
    level: $("#itemLevel").value,
    grade: $("#itemGrade").value.trim(),
    condition: $("#itemCondition").value,
    price: Number($("#itemPrice").value),
    desc: $("#itemDescription").value.trim(),
    seller: currentUser.name || currentUser.username,
    image: selectedPhoto,
    color: "#e2ebf1",
    art: "NEW FIND"
  };

  const custom = read("ss_custom_products", []);
  custom.unshift(product);

  try {
    save("ss_custom_products", custom);
    products = [...custom, ...sampleProducts];

    selectedPhoto = "";
    $("#sellForm").reset();
    $("#photoPreview").textContent = "＋";
    $("#categoryFilter").value = "All";
    $("#levelFilter").value = "All";
    $("#searchInput").value = "";
    activeLevel = "All";

    setPage("home");
    notify("Your item has been listed!");
  } catch {
    notify("Could not save this listing. Try a smaller photo.");
  }
});

// Product detail actions: ADD TO CART and MAKE AN OFFER.
$("#productDetail").addEventListener("click", e => {
  const addButton = e.target.closest("[data-add]");

  if (addButton) {
    addToCart(addButton.dataset.add);
    return;
  }

  if (e.target.closest("#makeOffer")) {
    const offerBox = $("#offerBox");
    const offerInput = $("#offerAmount");

    if (!offerBox || !offerInput) return;

    offerBox.classList.remove("hidden");
    offerInput.focus();
    offerInput.select();
    return;
  }

  if (e.target.closest("#cancelOffer")) {
    const offerBox = $("#offerBox");

    if (offerBox) {
      offerBox.classList.add("hidden");
    }
  }
});

// Submit inline offer.
$("#productDetail").addEventListener("submit", e => {
  if (e.target.id !== "offerBox") return;

  e.preventDefault();

  const p = products.find(x => x.id === currentDetailId);
  const offerInput = $("#offerAmount");
  const amount = Number(offerInput?.value);

  if (!p || !offerInput) return;

  if (!Number.isFinite(amount) || amount < 1000) {
    notify("Enter a valid offer amount.");
    offerInput.focus();
    return;
  }

  if (amount >= Number(p.price)) {
    notify("Try an offer lower than the listed price.");
    offerInput.focus();
    return;
  }

  $("#offerBox").classList.add("hidden");

  notify(
    "Offer of " + money(amount) +
    " prepared. Seller approval needs a backend."
  );
});

// Initialize the website.
loadCustomProducts();
loadSession();
paidItems = currentUser
  ? read("ss_paid_" + currentUser.username, [])
  : [];

renderAccount();
setPage(currentUser ? "home" : "landing");

const texts = [
    "Welcome",
    "Good things, again.",
    "Find your next chapter.",
    "Pass it to on."
];

const typingText = document.getElementById("typing-text");

let textIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeEffect() {
    const currentText = texts[textIndex];

    if (isDeleting) {
        charIndex--;
    } else {
        charIndex++;
    }

    typingText.textContent = currentText.substring(0, charIndex);

    let speed = isDeleting ? 45 : 100;

    if (!isDeleting && charIndex === currentText.length) {
        speed = 1800;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % texts.length;
        speed = 400;
    }

    setTimeout(typeEffect, speed);
}

typeEffect();