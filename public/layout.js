(function () {
  'use strict';

  /* Single source of truth for the 4 zones */
  const ZONES = {
    medicines: { label:'Medicines',       icon:'fa-pills',     color:'#1B4332' },
    beauty:    { label:'Beauty Products', icon:'fa-spa',       color:'#E11D48' },
    snacks:    { label:'Healthy Snacks',  icon:'fa-apple-alt', color:'#D97706' },
    needfuls:  { label:'Needfuls',        icon:'fa-box-open',  color:'#2563EB' },
  };

  const page = document.body.dataset.page || '';
  const zone = document.body.dataset.zone || '';
  const onHome = page === 'home';
  const zoneHref = k => onHome ? '#zone-' + k : '/products.html?category=' + k;

  /* ── Shared cart (localStorage) ── */
  const Cart = {
    KEY: 'vrinda_cart',
    get() { try { return JSON.parse(localStorage.getItem(this.KEY)) || []; } catch (e) { return []; } },
    save(items) {
      localStorage.setItem(this.KEY, JSON.stringify(items));
      this.syncBadge();
      document.dispatchEvent(new CustomEvent('cart:updated'));
    },
    add(p, qty = 1) {
      const items = this.get();
      const found = items.find(i => i.id === p._id);
      if (found) found.qty = Math.min(99, found.qty + qty);
      else items.push({ id: p._id, name: p.name, brand: p.brand, pack: p.pack, price: p.price,
                        mrp: p.mrp, image: p.image, requiresPrescription: !!p.requiresPrescription, qty });
      this.save(items);
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
        <div class="hidden md:flex flex-1 max-w-xl mx-8">
          <div class="search-box flex items-center w-full border rounded-xl px-4 h-11" style="border-color:rgba(0,0,0,.1);background:rgba(253,248,240,.6)">
            <i class="fas fa-search mr-3 text-sm" style="color:rgba(0,0,0,.25)"></i>
            <input id="site-search" type="text" placeholder="Search medicines, beauty, snacks, needfuls..." class="flex-1 bg-transparent text-sm focus:outline-none" style="color:#153628"/>
          </div>
        </div>
        <div class="flex items-center gap-1 md:gap-2">
          <a href="/products.html" class="md:hidden nav-icon-btn w-10 h-10 rounded-xl flex items-center justify-center" style="color:#1B4332"><i class="fas fa-search"></i></a>
          <a href="login.html" class="nav-icon-btn hidden sm:flex w-10 h-10 rounded-xl items-center justify-center" style="color:#1B6B47"><i class="fas fa-user text-sm"></i></a>
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
                <li><a href="account.html" class="text-sm hover:text-green-800 flex items-center gap-2" style="color:rgba(0,0,0,.6)"><i class="fas fa-redo text-[10px]" style="color:#C5A55A"></i> Order Refills</a></li>
                <li><a href="cart.html" class="text-sm hover:text-green-800 flex items-center gap-2" style="color:rgba(0,0,0,.6)"><i class="fas fa-shopping-bag text-[10px]" style="color:#C5A55A"></i> My Cart</a></li>
              </ul>
            </div>
          </div>
        </div>
        ${homeLink}
        ${navLinks}
        <a href="#" class="text-xs font-semibold px-3 py-2 rounded-lg hover:bg-amber-50 whitespace-nowrap" style="color:#B8952F">Offers</a>
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
      <div class="mb-6">
        <div class="flex items-center gap-3 p-3 rounded-xl" style="background:#F0F7F4">
          <div class="w-10 h-10 rounded-full flex items-center justify-center" style="background:#1B4332"><i class="fas fa-user text-white text-sm"></i></div>
          <div><div class="text-sm font-semibold" style="color:#153628">Welcome!</div><a href="login.html" class="text-xs" style="color:#2D8A5E">Login / Sign Up</a></div>
        </div>
      </div>
      <nav class="space-y-1">
        ${drawerLinks}
        <div class="my-3" style="border-top:1px solid rgba(0,0,0,.06)"></div>
        <a href="prescription.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-green-50" style="color:rgba(0,0,0,.6)"><i class="fas fa-file-prescription text-xs w-5 text-center" style="color:#C5A55A"></i> Upload Prescription</a>
        <a href="cart.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-green-50" style="color:rgba(0,0,0,.6)"><i class="fas fa-shopping-bag text-xs w-5 text-center" style="color:#C5A55A"></i> My Cart</a>
      </nav>
    </div>
  </div>`;

  /* ── Footer (matches your .bg-dark-footer / .foot-link / .nl-input classes —
     your original paste cut off before the footer, so swap in your real one later if you prefer) ── */
  const shopLinks = Object.keys(ZONES).map(k =>
    `<li><a href="/products.html?category=${k}" class="foot-link text-sm" style="color:rgba(255,255,255,.55)">${ZONES[k].label}</a></li>`).join('');

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
            <li><a href="#" class="foot-link text-sm" style="color:rgba(255,255,255,.55)">About Us</a></li>
            <li><a href="#" class="foot-link text-sm" style="color:rgba(255,255,255,.55)">Health Blog</a></li>
            <li><a href="#" class="foot-link text-sm" style="color:rgba(255,255,255,.55)">Contact</a></li>
            <li><a href="#" class="foot-link text-sm" style="color:rgba(255,255,255,.55)">FAQs</a></li>
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

  const search = document.getElementById('site-search');
  if (search) search.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = search.value.trim();
      window.location.href = '/products.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    }
  });

  Cart.syncBadge();
})();
