(function () {
  'use strict';

  /* ── Session ── */
  let SESSION_USER = null;
  try { SESSION_USER = JSON.parse(localStorage.getItem('vrinda_user') || 'null'); } catch (e) {}
  const SESSION_TOKEN = localStorage.getItem('vrinda_token');
  const isAuthed = !!(SESSION_TOKEN && SESSION_USER);
  const isStaff = isAuthed && ['admin', 'superadmin'].includes(SESSION_USER.role);
  const accountHref = !isAuthed ? 'login.html' : (isStaff ? 'admin.html' : 'account.html');

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const inr = n => '₹' + Number(n).toLocaleString('en-IN');

  const ZONES = {
    medicines: { label:'Medicines',        icon:'fa-pills',     color:'#1B4332' },
    beauty:    { label:'Beauty Products',  icon:'fa-spa',       color:'#E11D48' },
    snacks:    { label:'Healthy Snacks',   icon:'fa-apple-alt', color:'#D97706' },
    needfuls:  { label:'Needfuls',          icon:'fa-box-open',  color:'#2563EB' },
  };

  /* pages register their fetched products here so the smart-stepper engine can find them */
  window.__prodCache = window.__prodCache || {};
  const page = document.body.dataset.page || '';
  const zone = document.body.dataset.zone || '';
  const onHome = page === 'home';
  const zoneHref = k => onHome ? '#zone-' + k : '/products.html?category=' + k;

  /* ── Cart ── */
  const Cart = {
    KEY: 'vrinda_cart',
    get() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (e) { return []; } },
    save(items) {
      localStorage.setItem(this.KEY, JSON.stringify(items));
      this.syncBadge();
      document.dispatchEvent(new CustomEvent('cart:updated'));
    },
    stepperHTML(p) {
      const items = this.get();
      const it = items.find(i => i.id === p._id);
      if (!it) {
        return `<button class="prod-add" data-id="${p._id}"><i class="fas fa-plus text-[10px]"></i> ADD</button>`;
      }
      return `<div class="prod-stepper" data-id="${p._id}">
        <button class="st-dec" data-id="${p._id}" title="Decrease"><i class="fas fa-minus text-[10px]"></i></button>
        <span class="st-val">${it.qty}</span>
        <button class="st-inc" data-id="${p._id}" title="Increase"><i class="fas fa-plus text-[10px]"></i></button>
      </div>`;
    },
    add(p, qty = 1) {
      // LOGIN REQUIRED to add items
      if (!localStorage.getItem('vrinda_token')) {
        VrindaToast('Please log in to add items to your cart');
        setTimeout(() => {
          location.href = 'login.html?redirect=' + encodeURIComponent(location.pathname + location.search);
        }, 1000);
        return false;
      }
      const items = this.get();
      const found = items.find(i => i.id === p._id);
      if (found) {
        found.qty = Math.min(99, found.qty + qty);
      } else {
        items.push({
          id: p._id,
          name: p.name,
          brand: p.brand || '',
          pack: p.pack || '',
          price: p.price,
          mrp: p.mrp,
          image: p.image || '',
          requiresPrescription: !!p.requiresPrescription,
          qty
        });
      }
      this.save(items);
      return true;
    },
    setQty(id, qty) {
      const items = this.get();
      const it = items.find(i => i.id === id);
      if (it) { it.qty = Math.max(1, Math.min(99, qty)); this.save(items); }
    },
    remove(id) { this.save(this.get().filter(i => i.id !== id)); },
    count() { return this.get().reduce((n, i) => n + i.qty, 0); },
    syncBadge() { const b = document.getElementById('cart-count'); if (b) b.textContent = this.count(); },
  };
  
  window.VrindaCart = Cart;

  window.VrindaToast = function (msg) {
    let t = document.getElementById('vrinda-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'vrinda-toast';
      t.className = 'toast fixed bottom-6 right-6 z-[90] px-5 py-3 rounded-xl text-sm font-semibold text-white shadow-2xl';
      t.style.background = '#1B4332';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2200);
  };

  /* ── Header ── */
  const navLinks = Object.keys(ZONES).map(k => {
    const z = ZONES[k], active = page === 'products' && zone === k;
    return `<a href="${zoneHref(k)}" class="text-xs px-3 py-2 rounded-lg hover:bg-green-50 whitespace-nowrap"
              style="color:${active ? z.color : 'rgba(0,0,0,.5)'};font-weight:${active ? 700 : 500}">${z.label}</a>`;
  }).join('');

  const megaCats = Object.keys(ZONES).map(k =>
    `<li><a href="${zoneHref(k)}" class="text-sm hover:text-green-800 flex items-center gap-2" style="color:rgba(0,0,0,.6)">
       <i class="fas ${ZONES[k].icon} text-[10px]" style="color:${ZONES[k].color}"></i> ${ZONES[k].label}</a></li>`).join('');

  const drawerLinks = Object.keys(ZONES).map(k =>
    `<a href="${zoneHref(k)}" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-green-50" style="color:rgba(0,0,0,.6)">
       <i class="fas ${ZONES[k].icon} text-xs w-5 text-center" style="color:${ZONES[k].color}"></i> ${ZONES[k].label}</a>`).join('');

  const homeLink = onHome ? '' :
    `<a href="/home.html" class="text-xs font-medium px-3 py-2 rounded-lg hover:bg-green-50 whitespace-nowrap" style="color:rgba(0,0,0,.5)">Home</a>`;

  const drawerWelcome = isAuthed ? `
      <div class="flex items-center gap-3 p-3 rounded-xl" style="background:#F0F7F4">
        <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style="background:#1B4332"><span class="text-white text-sm font-bold">${esc((SESSION_USER.name || 'U')[0].toUpperCase())}</span></div>
        <div class="min-w-0">
          <div class="text-sm font-semibold truncate" style="color:#153628">${esc(SESSION_USER.name)}</div>
          <a href="${accountHref}" class="text-xs font-medium" style="color:#2D8A5E">My Account →</a>
        </div>
      </div>` : `
      <div class="flex items-center gap-3 p-3 rounded-xl" style="background:#F0F7F4">
        <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background:#1B4332"><i class="fas fa-user text-white text-sm"></i></div>
        <div><div class="text-sm font-semibold" style="color:#153628">Welcome!</div><a href="login.html" class="text-xs" style="color:#2D8A5E">Login / Sign Up</a></div>
      </div>`;

  const drawerAuthLinks = isAuthed ? `
        ${isStaff ? `<a href="admin.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-amber-50" style="color:#B8952F"><i class="fas fa-shield-halved text-xs w-5 text-center"></i> Admin Panel</a>` : ''}
        <a href="account.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-green-50" style="color:rgba(0,0,0,.6)"><i class="fas fa-circle-user text-xs w-5 text-center" style="color:#1B6B47"></i> My Orders &amp; Profile</a>
        <button id="drawer-logout" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-red-50 w-full" style="color:#DC2626"><i class="fas fa-arrow-right-from-bracket text-xs w-5 text-center"></i> Logout</button>` : '';

  const headerHTML = `
  <div class="bg-dark-top text-white">
    <div class="max-w-7xl mx-auto px-4 md:px-6 flex items-center justify-between h-9">
      <div class="flex items-center gap-4" style="color:rgba(255,255,255,.85)">
        <span class="flex items-center gap-1.5 text-xs"><i class="fas fa-map-marker-alt" style="color:#C5A55A;font-size:10px"></i> Delivery in Mumbai</span>
        <span class="hidden md:flex items-center gap-1.5 text-xs"><i class="fas fa-phone" style="color:#C5A55A;font-size:10px"></i> +91 99673 78987</span>
      </div>
      <div class="flex items-center gap-4" style="color:rgba(255,255,255,.85)">
        <span class="hidden sm:flex items-center gap-1.5 text-xs"><i class="fas fa-shield-alt" style="color:#C5A55A;font-size:10px"></i> Licensed Pharmacy</span>
        <span class="flex items-center gap-1.5 text-xs"><i class="fas fa-clock" style="color:#C5A55A;font-size:10px"></i> 8AM – 10PM</span>
      </div>
    </div>
  </div>

  <header class="sticky top-0 z-50 border-b border-black/5" style="background:rgba(255,255,255,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)">
    <div class="max-w-7xl mx-auto px-4 md:px-6">
      <div class="flex items-center justify-between h-16 md:h-[72px]">
        <button id="mob-toggle" class="lg:hidden nav-icon-btn w-10 h-10 rounded-xl flex items-center justify-center" style="color:#1B4332"><i class="fas fa-bars text-lg"></i></button>
        <a href="/home.html" class="flex items-center gap-2.5 shrink-0">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:#1B4332"><span class="font-display font-bold text-white text-sm">V</span></div>
          <div class="hidden sm:block">
            <div class="font-display font-semibold text-[15px] leading-tight tracking-tight" style="color:#1B4332">Vrinda</div>
            <div class="text-[10px] font-medium tracking-widest uppercase -mt-0.5" style="color:#2D8A5E">Wellness</div>
          </div>
        </a>
        <div class="hidden md:flex flex-1 max-w-xl mx-8 relative">
          <div class="search-box flex items-center w-full border rounded-xl px-4 h-11" style="border-color:rgba(0,0,0,.1);background:rgba(253,248,240,.6)">
            <i class="fas fa-search mr-3 text-sm" style="color:rgba(0,0,0,.25)"></i>
            <input id="site-search" type="text" placeholder="Search medicines, beauty, snacks... (Ctrl+K)" class="flex-1 bg-transparent text-sm focus:outline-none" style="color:#153628" autocomplete="off"/>
            <kbd class="hidden xl:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border border-black/10 text-black/40">Ctrl K</kbd>
          </div>
          <!-- Live search suggestions dropdown -->
          <div id="search-suggestions" class="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-black/5 p-2 hidden z-[100] max-h-96 overflow-y-auto"></div>
        </div>
        <div class="flex items-center gap-1 md:gap-2">
          <a href="/products.html" class="md:hidden nav-icon-btn w-10 h-10 rounded-xl flex items-center justify-center" style="color:#1B4332"><i class="fas fa-search"></i></a>
          <a href="wishlist.html" title="Saved Wishlist" class="nav-icon-btn hidden sm:flex w-10 h-10 rounded-xl items-center justify-center" style="color:#1B6B47"><i class="fas fa-heart text-sm"></i></a>
          <a href="${accountHref}" title="Account" class="nav-icon-btn hidden sm:flex w-10 h-10 rounded-xl items-center justify-center" style="color:#1B6B47"><i class="fas fa-user text-sm"></i></a>
          <a href="cart.html" class="nav-icon-btn flex w-10 h-10 md:w-auto md:h-11 rounded-xl items-center justify-center md:px-4 gap-2 relative" style="color:#1B4332;background:rgba(27,67,50,.05)">
            <i class="fas fa-shopping-bag text-sm"></i>
            <span class="hidden md:inline text-xs font-semibold">Cart</span>
            <span id="cart-count" class="absolute -top-1 -right-1 md:top-0 md:right-0 w-[18px] h-[18px] text-white text-[10px] font-bold rounded-full flex items-center justify-center" style="background:#C5A55A">0</span>
          </a>
        </div>
      </div>
      <nav class="hidden lg:flex items-center gap-1 pb-3 -mt-1 overflow-x-auto no-scrollbar">
        <div class="mega-trigger relative">
          <button class="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-green-50" style="color:#1B4332"><i class="fas fa-th-large text-[10px]"></i> All Categories <i class="fas fa-chevron-down text-[8px] ml-0.5 opacity-50"></i></button>
          <div class="mega-menu absolute top-full left-0 mt-2 w-[600px] bg-white rounded-2xl shadow-xl border border-black/5 p-6 grid grid-cols-2 gap-4">
            <div>
              <h4 class="text-[10px] font-bold uppercase tracking-widest mb-3" style="color:#1B4332">Categories</h4>
              <ul class="space-y-2.5">${megaCats}</ul>
            </div>
            <div>
              <h4 class="text-[10px] font-bold uppercase tracking-widest mb-3" style="color:#1B4332">Quick Actions</h4>
              <ul class="space-y-2.5">
                <li><a href="prescription.html" class="text-sm hover:text-green-800 flex items-center gap-2" style="color:rgba(0,0,0,.6)"><i class="fas fa-file-prescription text-[10px]" style="color:#C5A55A"></i> Upload Prescription</a></li>
                <li><a href="wishlist.html" class="text-sm hover:text-green-800 flex items-center gap-2" style="color:rgba(0,0,0,.6)"><i class="fas fa-heart text-[10px]" style="color:#E11D48"></i> Saved Wishlist</a></li>
                <li><a href="account.html" class="text-sm hover:text-green-800 flex items-center gap-2" style="color:rgba(0,0,0,.6)"><i class="fas fa-redo text-[10px]" style="color:#C5A55A"></i> Order Refills</a></li>
                <li><a href="cart.html" class="text-sm hover:text-green-800 flex items-center gap-2" style="color:rgba(0,0,0,.6)"><i class="fas fa-shopping-bag text-[10px]" style="color:#C5A55A"></i> My Cart</a></li>
              </ul>
            </div>
          </div>
        </div>
        ${homeLink}
        ${navLinks}
        <a href="offers.html" class="text-xs font-semibold px-3 py-2 rounded-lg hover:bg-amber-50 whitespace-nowrap" style="color:#B8952F">Offers</a>
      </nav>
    </div>
  </header>

  <div id="mob-overlay" class="mobile-overlay fixed inset-0 z-[60] bg-black/40 lg:hidden" style="backdrop-filter:blur(4px)"></div>
  <div id="mob-drawer" class="mobile-drawer fixed top-0 left-0 bottom-0 z-[70] w-[300px] bg-white shadow-2xl lg:hidden overflow-y-auto">
    <div class="p-5">
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-2.5">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:#1B4332"><span class="font-display font-bold text-white text-sm">V</span></div>
          <div><div class="font-display font-semibold text-[15px] leading-tight" style="color:#1B4332">Vrinda</div><div class="text-[10px] font-medium tracking-widest uppercase -mt-0.5" style="color:#2D8A5E">Wellness</div></div>
        </div>
        <button id="mob-close" class="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100" style="color:rgba(0,0,0,.4)"><i class="fas fa-times"></i></button>
      </div>
      <div class="mb-6">${drawerWelcome}</div>
      <nav class="space-y-1">
        ${drawerLinks}
        <div class="my-3" style="border-top:1px solid rgba(0,0,0,.06)"></div>
        <a href="offers.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-amber-50" style="color:#B8952F"><i class="fas fa-tags text-xs w-5 text-center"></i> Offers &amp; Deals</a>
        <a href="wishlist.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-green-50" style="color:rgba(0,0,0,.6)"><i class="fas fa-heart text-xs w-5 text-center" style="color:#E11D48"></i> Saved Wishlist</a>
        <a href="prescription.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-green-50" style="color:rgba(0,0,0,.6)"><i class="fas fa-file-prescription text-xs w-5 text-center" style="color:#C5A55A"></i> Upload Prescription</a>
        <a href="cart.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-green-50" style="color:rgba(0,0,0,.6)"><i class="fas fa-shopping-bag text-xs w-5 text-center" style="color:#C5A55A"></i> My Cart</a>
        ${drawerAuthLinks}
      </nav>
    </div>
  </div>`;

  /* ── Footer ── */
  const shopLinks = Object.keys(ZONES).map(k =>
    `<li><a href="/products.html?category=${k}" class="foot-link text-sm" style="color:rgba(255,255,255,.55)">${ZONES[k].label}</a></li>`).join('') +
    '<li><a href="offers.html" class="foot-link text-sm" style="color:rgba(255,255,255,.55)">Offers &amp; Deals</a></li>' +
    '<li><a href="wishlist.html" class="foot-link text-sm" style="color:rgba(255,255,255,.55)">Saved Wishlist</a></li>';

  const footerHTML = `
  <footer class="bg-dark-footer text-white">
    <div class="max-w-7xl mx-auto px-4 md:px-6 pt-14 pb-8">
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
        <div>
          <div class="flex items-center gap-2.5 mb-4">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center" style="background:#C5A55A"><span class="font-display font-bold text-white text-sm">V</span></div>
            <div><div class="font-display font-semibold text-[15px] leading-tight">Vrinda</div><div class="text-[10px] font-medium tracking-widest uppercase -mt-0.5" style="color:#7FC4A0">Wellness</div></div>
          </div>
          <p class="text-xs leading-relaxed mb-5" style="color:rgba(255,255,255,.5)">Your trusted licensed pharmacy for medicines, beauty, healthy snacks and daily needfuls — delivered across Mumbai, 8AM–10PM.</p>
          <div class="flex gap-2">
            <a href="#" class="w-9 h-9 rounded-xl flex items-center justify-center text-xs" style="background:rgba(255,255,255,.08);color:rgba(255,255,255,.6)"><i class="fab fa-instagram"></i></a>
            <a href="#" class="w-9 h-9 rounded-xl flex items-center justify-center text-xs" style="background:rgba(255,255,255,.08);color:rgba(255,255,255,.6)"><i class="fab fa-facebook-f"></i></a>
            <a href="#" class="w-9 h-9 rounded-xl flex items-center justify-center text-xs" style="background:rgba(255,255,255,.08);color:rgba(255,255,255,.6)"><i class="fab fa-whatsapp"></i></a>
          </div>
        </div>
        <div>
          <h4 class="text-[10px] font-bold uppercase tracking-widest mb-4" style="color:#C5A55A">Shop</h4>
          <ul class="space-y-2.5">${shopLinks}</ul>
        </div>
        <div>
          <h4 class="text-[10px] font-bold uppercase tracking-widest mb-4" style="color:#C5A55A">Company</h4>
          <ul class="space-y-2.5">
            <li><a href="track.html" class="foot-link text-sm" style="color:rgba(255,255,255,.55)">Track Order</a></li>
            <li><a href="about.html" class="foot-link text-sm" style="color:rgba(255,255,255,.55)">About Us</a></li>
            <li><a href="about.html#tips" class="foot-link text-sm" style="color:rgba(255,255,255,.55)">Wellness Tips</a></li>
            <li><a href="contact.html" class="foot-link text-sm" style="color:rgba(255,255,255,.55)">Contact</a></li>
            <li><a href="contact.html#faq" class="foot-link text-sm" style="color:rgba(255,255,255,.55)">FAQs</a></li>
          </ul>
        </div>
        <div>
          <h4 class="text-[10px] font-bold uppercase tracking-widest mb-4" style="color:#C5A55A">Stay in the loop</h4>
          <p class="text-xs mb-4" style="color:rgba(255,255,255,.5)">Health tips &amp; offers, once a week. No spam.</p>
          <form class="flex gap-2" onsubmit="event.preventDefault(); this.reset(); VrindaToast('Subscribed! Welcome to the family.')">
            <input type="email" required placeholder="you@email.com" class="nl-input flex-1 h-11 rounded-xl px-4 text-sm" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#fff;outline:none"/>
            <button class="h-11 px-4 rounded-xl text-white text-sm font-semibold" style="background:#C5A55A">Join</button>
          </form>
          <div class="mt-5 space-y-1.5 text-xs" style="color:rgba(255,255,255,.45)">
            <div><i class="fas fa-phone mr-2" style="color:#C5A55A"></i>+91 99673 78987</div>
            <div><i class="fas fa-envelope mr-2" style="color:#C5A55A"></i>care@vrindawellness.in</div>
          </div>
        </div>
      </div>
      <div class="pt-6 flex flex-col md:flex-row items-center justify-between gap-3" style="border-top:1px solid rgba(255,255,255,.08)">
        <p class="text-[11px]" style="color:rgba(255,255,255,.4)">© 2025 Vrinda Wellness · Licensed Pharmacy · Mumbai</p>
        <div class="flex items-center gap-4 text-lg" style="color:rgba(255,255,255,.35)"><i class="fab fa-cc-visa"></i><i class="fab fa-cc-mastercard"></i><i class="fab fa-google-pay"></i><i class="fas fa-mobile-alt"></i></div>
      </div>
    </div>
  </footer>`;

  /* ── Staff floating shortcut: always one click from the panel ── */
  if (isStaff && !document.getElementById('back-to-admin')) {
    const pill = document.createElement('a');
    pill.id = 'back-to-admin';
    pill.href = 'admin.html';
    pill.innerHTML = '<i class="fas fa-shield-halved text-xs"></i> Admin Panel';
    pill.style.cssText = 'position:fixed;bottom:24px;left:24px;z-index:80;display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:100px;background:#153628;color:#C5A55A;font-size:12px;font-weight:700;text-decoration:none;box-shadow:0 8px 24px rgba(21,54,40,.35);transition:all .3s ease';
    pill.addEventListener('mouseenter', () => pill.style.transform = 'translateY(-2px)');
    pill.addEventListener('mouseleave', () => pill.style.transform = '');
    document.body.appendChild(pill);
  }

  window.VrindaLogout = function () {
    localStorage.removeItem('vrinda_token');
    localStorage.removeItem('vrinda_user');
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('vrinda_')) localStorage.removeItem(k);
    });
    location.href = 'login.html';
  };

  /* ── Mount + wire ── */
  const h = document.getElementById('site-header');
  if (h) h.innerHTML = headerHTML;
  const f = document.getElementById('site-footer');
  if (f) f.innerHTML = footerHTML;

  const toggle = document.getElementById('mob-toggle');
  const drawer = document.getElementById('mob-drawer');
  const overlay = document.getElementById('mob-overlay');
  if (toggle && drawer && overlay) {
    const open  = () => { drawer.classList.add('open'); overlay.classList.add('open'); document.body.style.overflow = 'hidden'; };
    const close = () => { drawer.classList.remove('open'); overlay.classList.remove('open'); document.body.style.overflow = ''; };
    toggle.addEventListener('click', open);
    overlay.addEventListener('click', close);
    document.getElementById('mob-close')?.addEventListener('click', close);
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', close));
  }

  document.getElementById('drawer-logout')?.addEventListener('click', () => {
    localStorage.removeItem('vrinda_token');
    localStorage.removeItem('vrinda_user');
    location.href = 'login.html';
  });

  /* ═══ LIVE SEARCH & CTRL+K SHORTCUT ═══ */
  const search = document.getElementById('site-search');
  const suggestionsBox = document.getElementById('search-suggestions');
  let searchTimer = null;

  // Ctrl+K / Cmd+K global shortcut
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (search) {
        search.focus();
        search.select();
      }
    }
  });

  if (search && suggestionsBox) {
    search.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const q = search.value.trim();
        window.location.href = '/products.html' + (q ? '?q=' + encodeURIComponent(q) : '');
      } else if (e.key === 'Escape') {
        suggestionsBox.classList.add('hidden');
      }
    });

    search.addEventListener('input', () => {
      const q = search.value.trim();
      clearTimeout(searchTimer);
      if (q.length < 2) {
        suggestionsBox.classList.add('hidden');
        suggestionsBox.innerHTML = '';
        return;
      }
      searchTimer = setTimeout(() => {
        fetch('/api/v1/products?q=' + encodeURIComponent(q))
          .then(res => res.json())
          .then(data => {
            const list = (data.products || []).slice(0, 6);
            if (!list.length) {
              suggestionsBox.innerHTML = `
                <div class="p-3 text-center text-xs" style="color:rgba(0,0,0,.4)">
                  No products found for "<strong>${esc(q)}</strong>"
                </div>`;
              suggestionsBox.classList.remove('hidden');
              return;
            }
            suggestionsBox.innerHTML = `
              <div class="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5" style="color:#2D8A5E">Products</div>
              <div class="divide-y divide-black/5">
                ${list.map(p => `
                  <a href="/product.html?id=${p._id}" class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-green-50 transition block">
                    <img src="${esc(p.image)}" alt="" class="w-10 h-10 rounded-lg object-cover bg-gray-50 flex-shrink-0"/>
                    <div class="flex-1 min-w-0">
                      <div class="text-xs font-semibold truncate" style="color:#153628">${esc(p.name)}</div>
                      <div class="text-[10px] truncate" style="color:rgba(0,0,0,.4)">${esc(p.brand)}${p.pack ? ' · ' + esc(p.pack) : ''}</div>
                    </div>
                    <div class="text-xs font-bold" style="color:#1B4332">${inr(p.price)}</div>
                  </a>`).join('')}
              </div>
              <a href="/products.html?q=${encodeURIComponent(q)}" class="block text-center text-xs font-semibold py-2 mt-1 rounded-lg hover:bg-green-50" style="color:#2D8A5E">
                View all results for "${esc(q)}" →
              </a>`;
            suggestionsBox.classList.remove('hidden');
          })
          .catch(() => { suggestionsBox.classList.add('hidden'); });
      }, 250);
    });

    // Close suggestions on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('.search-box') && !e.target.closest('#search-suggestions')) {
        suggestionsBox.classList.add('hidden');
      }
    });
  }

  /* ── Smart ADD/stepper engine — works on any page via delegation ── */
  document.addEventListener('click', async e => {
    const add = e.target.closest('.prod-add');
    if (add) {
      e.preventDefault();
      e.stopPropagation();
      const p = window.__prodCache && window.__prodCache[add.dataset.id];
      if (!p) return;
      if (Cart.add(p)) VrindaToast(p.name + ' added to cart');
      document.dispatchEvent(new CustomEvent('cart:updated'));
      return;
    }

    const inc = e.target.closest('.st-inc');
    if (inc) {
      e.preventDefault();
      e.stopPropagation();
      const items = Cart.get();
      const it = items.find(i => i.id === inc.dataset.id);
      if (it) { Cart.setQty(inc.dataset.id, it.qty + 1); document.dispatchEvent(new CustomEvent('cart:updated')); }
      return;
    }

    const dec = e.target.closest('.st-dec');
    if (dec) {
      e.preventDefault();
      e.stopPropagation();
      const items = Cart.get();
      const it = items.find(i => i.id === dec.dataset.id);
      if (it) {
        if (it.qty <= 1) { Cart.remove(dec.dataset.id); VrindaToast('Removed from cart'); }
        else Cart.setQty(dec.dataset.id, it.qty - 1);
        document.dispatchEvent(new CustomEvent('cart:updated'));
      }
    }
  });

  /* ── Universal GST Pharmacy Tax Invoice Generator ── */
  window.VrindaPrintInvoice = function (order) {
    if (!order) return;
    const invDate = new Date(order.createdAt || Date.now()).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const subtotal = order.subtotal || (order.items || []).reduce((s, i) => s + (i.price * i.qty), 0);
    const delivery = order.deliveryFee || 0;
    const total = order.total || (subtotal + delivery);

    const win = window.open('', '_blank', 'width=840,height=900');
    if (!win) {
      if (window.VrindaToast) VrindaToast('Please allow popups to view the invoice');
      return;
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Tax Invoice — ${esc(order.orderNumber)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1f2937; margin: 0; padding: 32px; background: #fff; font-size: 13px; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1B4332; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { font-size: 24px; font-weight: 800; color: #1B4332; letter-spacing: -0.5px; }
    .tagline { font-size: 11px; text-transform: uppercase; color: #78716c; letter-spacing: 1px; font-weight: 600; margin-top: 2px; }
    .lic-badge { margin-top: 8px; font-size: 11px; color: #4b5563; }
    .inv-meta { text-align: right; }
    .inv-title { font-size: 20px; font-weight: 800; color: #1B4332; text-transform: uppercase; letter-spacing: 1px; }
    .inv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; padding: 16px; background: #fafaf9; border-radius: 8px; border: 1px solid #e7e5e4; }
    .inv-grid h4 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #78716c; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { text-align: left; background: #1B4332; color: #fff; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    .totals { width: 320px; margin-left: auto; margin-bottom: 30px; }
    .totals tr td { padding: 6px 12px; }
    .totals tr.grand-total td { font-size: 15px; font-weight: 800; color: #1B4332; border-top: 2px solid #1B4332; border-bottom: 2px solid #1B4332; }
    .footer { border-top: 1px dashed #d1d5db; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; font-size: 11px; color: #6b7280; }
    .stamp { border: 1px solid #9ca3af; padding: 12px 18px; border-radius: 6px; text-align: center; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:20px;display:flex;gap:12px;justify-content:flex-end">
    <button onclick="window.print()" style="background:#1B4332;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-weight:600;cursor:pointer">🖨️ Print / Save as PDF</button>
    <button onclick="window.close()" style="background:#e5e7eb;color:#374151;border:none;padding:10px 16px;border-radius:6px;font-weight:600;cursor:pointer">Close</button>
  </div>

  <div class="header">
    <div>
      <div class="brand">Vrinda Wellness</div>
      <div class="tagline">Licensed Pharmacy & Healthcare Services</div>
      <div class="lic-badge">
        14, Linking Road, Bandra West, Mumbai, MH — 400050<br/>
        <strong>GSTIN:</strong> 27AABCV1234F1Z8 &nbsp;|&nbsp; <strong>DL No:</strong> 20B/MH-MZ2-452189, 21B/MH-MZ2-452190
      </div>
    </div>
    <div class="inv-meta">
      <div class="inv-title">TAX INVOICE</div>
      <div><strong>Invoice #:</strong> INV-${esc(order.orderNumber)}</div>
      <div><strong>Date:</strong> ${invDate}</div>
      <div><strong>Order Ref:</strong> ${esc(order.orderNumber)}</div>
      <div><strong>Status:</strong> ${esc(order.status || 'Confirmed').toUpperCase()}</div>
    </div>
  </div>

  <div class="inv-grid">
    <div>
      <h4>Billed & Shipped To:</h4>
      <strong>${esc(order.customer?.name || 'Customer')}</strong><br/>
      Phone: ${esc(order.customer?.phone || '')}<br/>
      ${order.customer?.email ? 'Email: ' + esc(order.customer.email) + '<br/>' : ''}
      ${esc(order.address?.line1 || '')}<br/>
      ${esc(order.address?.city || 'Mumbai')}, ${esc(order.address?.state || 'Maharashtra')} — ${esc(order.address?.pincode || '')}
    </div>
    <div>
      <h4>Payment & Dispatch:</h4>
      <strong>Payment Mode:</strong> ${esc((order.paymentMethod || 'COD').toUpperCase())}<br/>
      <strong>Fulfillment:</strong> Express Same-Day Mumbai Dispatch<br/>
      <strong>Pharmacist Reg:</strong> MH-PH-889412<br/>
      <strong>Rx Verification:</strong> ${order.items?.some(i => i.requiresPrescription) ? 'Verified by Pharmacist' : 'Not Required / OTC'}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:36px">#</th>
        <th>Product Description</th>
        <th>Pack</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Price</th>
        <th style="text-align:right">GST Rate</th>
        <th style="text-align:right">Amount (₹)</th>
      </tr>
    </thead>
    <tbody>
      ${(order.items || []).map((it, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${esc(it.name)}</strong>${it.brand ? '<br/><span style="font-size:11px;color:#6b7280">' + esc(it.brand) + '</span>' : ''}</td>
          <td>${esc(it.pack || 'Standard')}</td>
          <td style="text-align:center">${it.qty}</td>
          <td style="text-align:right">₹${Number(it.price).toFixed(2)}</td>
          <td style="text-align:right">12%</td>
          <td style="text-align:right">₹${(it.price * it.qty).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td>Items Subtotal:</td>
      <td style="text-align:right">₹${Number(subtotal).toFixed(2)}</td>
    </tr>
    <tr>
      <td>Delivery / Handling:</td>
      <td style="text-align:right">${delivery === 0 ? 'FREE' : '₹' + Number(delivery).toFixed(2)}</td>
    </tr>
    <tr>
      <td>Taxes (CGST 6% + SGST 6% incl.):</td>
      <td style="text-align:right">₹${(subtotal * 0.12).toFixed(2)}</td>
    </tr>
    <tr class="grand-total">
      <td>Invoice Total:</td>
      <td style="text-align:right">₹${Number(total).toFixed(2)}</td>
    </tr>
  </table>

  <div class="footer">
    <div>
      <strong>Terms & Conditions:</strong><br/>
      1. This is an authentic computer-generated GST tax invoice for pharmaceutical goods.<br/>
      2. Medicines must be stored at advised temperature conditions.<br/>
      3. For queries or adverse reaction report: support@vrinda.online | +91 99673 78987.
    </div>
    <div class="stamp">
      <div style="font-size:10px;color:#6b7280;margin-bottom:24px">For VRINDA WELLNESS PHARMACY</div>
      <div style="border-top:1px dashed #6b7280;padding-top:4px;font-weight:700">Authorized Pharmacist</div>
    </div>
  </div>
</body>
</html>`;

    win.document.write(html);
    win.document.close();
  };

  /* pages register a repaint function; we call it whenever the cart changes */
  document.addEventListener('cart:updated', () => {
    if (window.__repaintSteppers) window.__repaintSteppers();
  });
  Cart.syncBadge();

})();