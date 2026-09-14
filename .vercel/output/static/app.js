/**
 * SREE MEENAKSHI HANDICRAFTS & KRISHIKA STORE
 * Storefront Application Engine (app.js)
 * Features: Dynamic Catalog, Cart Drawer, Razorpay Checkout, WhatsApp Orders, SEO & Analytics
 * Integrated with Node.js / Express REST API Backend
 */

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3001';

// ===== DEFAULT STORE SETTINGS (FALLBACK) =====
const DEFAULT_SETTINGS = {
  storeName: 'Sree Meenakshi Handicrafts',
  storeSubtitle: 'Handicrafts • Kanyakumari',
  whatsappNumber: '919944910653',
  storeEmail: 'info@sreemeenakshihandicrafts.com',
  storeAddress: 'Main Beach Road, Near Sunset Point, Kanyakumari, Tamil Nadu, 629702',
  currency: '₹',
  razorpayKey: 'rzp_test_placeholder_key',
  shippingFee: 150,
  freeShippingThreshold: 2999,
  adminPin: 'admin123',
  topBannerText1: '✨ Complimentary FREE Delivery on orders above ₹2,999',
  topBannerHighlight: '🎉 Use Coupon HERITAGE10 for 10% OFF',
  couponCode: 'HERITAGE10',
  couponDiscountPct: 10,
  welcomeCouponCode: 'WELCOME5',
  welcomeDiscountPct: 5
};

// ===== DEFAULT STORE FAQS (FALLBACK) =====
const DEFAULT_FAQS = [
  {
    id: 'faq_1',
    question: 'Are all sculptures genuinely handmade?',
    answer: 'Yes, 100%! Every single piece is carved, polished, and finished by generational artisans at our Kanyakumari workshop using traditional Indian tools and natural materials.'
  },
  {
    id: 'faq_2',
    question: 'What payment methods do you accept?',
    answer: 'We support all major online payment modes including UPI (Google Pay, PhonePe, Paytm), Credit & Debit Cards, and NetBanking via secure Razorpay checkout, as well as direct WhatsApp 1-click order confirmation.'
  },
  {
    id: 'faq_3',
    question: 'How are items packed to prevent transit breakage?',
    answer: 'We use 4-tier reinforced packaging: moisture-barrier bubble wrap, heavy-duty molded thermocol foam casing, double-walled corrugated outer carton, and fragile wooden bracing for high-value stone and wood pieces.'
  },
  {
    id: 'faq_4',
    question: 'Can I place bulk or custom gifting orders?',
    answer: 'Absolutely! We specialize in custom corporate gifts, wedding favors, and wholesale gallery shipments. Please use the contact form below or message us directly on WhatsApp.'
  }
];

// ===== IN-MEMORY STORE STATE =====
let _storeProducts = [];
let _storeSettings = { ...DEFAULT_SETTINGS };
let _storeFaqs = [...DEFAULT_FAQS];

// ===== STATE MANAGEMENT =====
class StoreEngine {
  constructor() {
    this.cart = this.getCart();
    this.activeCategory = 'All';
    this.searchQuery = '';
    this.sortBy = 'featured';
    this.appliedCoupon = null;
    this.checkoutStep = 1;
    this.selectedPaymentMethod = 'razorpay';
    this.initStoreData();
    this.initSyncChannel();
  }

  async initStoreData() {
    await Promise.allSettled([
      this.fetchProducts(),
      this.fetchSettings(),
      this.fetchFaqs()
    ]);
  }

  initSyncChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const syncChannel = new BroadcastChannel('smh_store_sync');
        syncChannel.onmessage = (event) => {
          if (event.data?.type === 'PRODUCTS_UPDATED') {
            this.fetchProducts();
          } else if (event.data?.type === 'SETTINGS_UPDATED') {
            this.fetchSettings();
          } else if (event.data?.type === 'FAQS_UPDATED') {
            this.fetchFaqs();
          }
        };
      } catch (e) {}
    }
  }

  async fetchProducts() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          _storeProducts = data;
        }
      }
    } catch (e) {
      console.warn("Backend products fetch notice (using cache/defaults if needed):", e);
    }
    if (typeof renderCatalog === 'function') renderCatalog();
  }

  async fetchSettings() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        _storeSettings = { ...DEFAULT_SETTINGS, ...data };
      }
    } catch (e) {
      console.warn("Backend settings fetch notice:", e);
    }
    if (typeof renderTopBanner === 'function') renderTopBanner();
    if (typeof updateStoreContactDetails === 'function') updateStoreContactDetails();
  }

  async fetchFaqs() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/faqs`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          _storeFaqs = data;
        }
      }
    } catch (e) {
      console.warn("Backend FAQs fetch notice:", e);
    }
    if (typeof renderFaqs === 'function') renderFaqs();
  }

  getFaqs() {
    return _storeFaqs;
  }

  getProducts() {
    return _storeProducts;
  }

  getSettings() {
    return _storeSettings;
  }

  // Cart stays in localStorage for customer session persistence
  getCart() {
    try {
      const data = localStorage.getItem('smh_cart');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  saveCart() {
    localStorage.setItem('smh_cart', JSON.stringify(this.cart));
    this.updateCartUI();
  }

  addToCart(productId, quantity = 1) {
    const products = this.getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingIndex = this.cart.findIndex(item => item.id === productId);
    if (existingIndex > -1) {
      this.cart[existingIndex].quantity += quantity;
    } else {
      this.cart.push({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
        category: product.category,
        quantity: quantity
      });
    }

    this.saveCart();
    this.showToast(`"${product.title}" added to your cart!`, 'success');
  }

  updateQuantity(productId, delta) {
    const index = this.cart.findIndex(item => item.id === productId);
    if (index > -1) {
      this.cart[index].quantity += delta;
      if (this.cart[index].quantity <= 0) {
        this.cart.splice(index, 1);
        this.showToast('Item removed from cart', 'info');
      }
      this.saveCart();
    }
  }

  removeFromCart(productId) {
    this.cart = this.cart.filter(item => item.id !== productId);
    this.saveCart();
    this.showToast('Item removed from cart', 'info');
  }

  clearCart() {
    this.cart = [];
    this.saveCart();
  }

  getCartSubtotal() {
    return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  getDiscountAmount() {
    const subtotal = this.getCartSubtotal();
    const settings = this.getSettings();
    const activeCode = this.appliedCoupon ? this.appliedCoupon.toUpperCase() : '';
    const mainCode = (settings.couponCode || 'HERITAGE10').toUpperCase();
    const mainPct = parseFloat(settings.couponDiscountPct) || 10;
    const welCode = (settings.welcomeCouponCode || 'WELCOME5').toUpperCase();
    const welPct = parseFloat(settings.welcomeDiscountPct) || 5;

    if (activeCode && activeCode === mainCode) {
      return Math.round(subtotal * (mainPct / 100));
    } else if (activeCode && activeCode === welCode) {
      return Math.round(subtotal * (welPct / 100));
    }
    return 0;
  }

  getShippingFee() {
    const subtotal = this.getCartSubtotal();
    const settings = this.getSettings();
    const threshold = parseFloat(settings.freeShippingThreshold) || 2999;
    const fee = parseFloat(settings.shippingFee) || 150;
    if (subtotal === 0 || subtotal >= threshold) {
      return 0;
    }
    return fee;
  }

  getCartTotal() {
    const subtotal = this.getCartSubtotal();
    const discount = this.getDiscountAmount();
    const shipping = this.getShippingFee();
    return Math.max(0, subtotal - discount + shipping);
  }

  updateCartUI() {
    const count = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(b => {
      b.textContent = count;
      b.style.display = count > 0 ? 'flex' : 'none';
    });

    const itemsContainer = document.getElementById('cartItemsContainer');
    const subtotalEl = document.getElementById('cartSubtotal');
    const discountLine = document.getElementById('cartDiscountLine');
    const discountEl = document.getElementById('cartDiscount');
    const shippingEl = document.getElementById('cartShipping');
    const totalEl = document.getElementById('cartTotal');
    const freeShippingProgress = document.getElementById('freeShippingProgress');

    if (!itemsContainer) return;

    if (this.cart.length === 0) {
      itemsContainer.innerHTML = `
        <div class="cart-empty-state">
          <div class="empty-icon" style="font-size:3rem;margin-bottom:0.5rem;">🛍️</div>
          <h4>Your cart is empty</h4>
          <p style="font-size:0.85rem;margin-top:0.4rem;color:#8A7564;">Explore our handcrafted collections and add items to your cart.</p>
          <button class="btn btn-primary btn-sm" style="margin-top:1.2rem;" onclick="closeCart(); location.href='#products';">Shop Now</button>
        </div>
      `;
      if (subtotalEl) subtotalEl.textContent = '₹0';
      if (totalEl) totalEl.textContent = '₹0';
      if (shippingEl) shippingEl.textContent = '₹0';
      if (discountLine) discountLine.style.display = 'none';
      if (freeShippingProgress) {
        freeShippingProgress.innerHTML = 'Add items worth ₹2,999 for FREE delivery across India.';
      }
      return;
    }

    const subtotal = this.getCartSubtotal();
    const discount = this.getDiscountAmount();
    const shipping = this.getShippingFee();
    const total = this.getCartTotal();
    const settings = this.getSettings();
    const threshold = parseFloat(settings.freeShippingThreshold) || 2999;

    itemsContainer.innerHTML = this.cart.map(item => `
      <div class="cart-item">
        <img src="${item.image}" alt="${this.escapeHtml(item.title)}" class="cart-item-img" onerror="this.src='Pics/749419433_1052687420627433_4165588852915451748_n.jpg'" />
        <div class="cart-item-info">
          <h4 class="cart-item-title">${this.escapeHtml(item.title)}</h4>
          <div class="cart-item-price">₹${item.price.toLocaleString('en-IN')}</div>
          <div class="cart-item-controls">
            <button class="qty-btn" onclick="storeApp.updateQuantity('${item.id}', -1)">-</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="qty-btn" onclick="storeApp.updateQuantity('${item.id}', 1)">+</button>
            <button class="remove-btn" onclick="storeApp.removeFromCart('${item.id}')" title="Remove item">🗑️</button>
          </div>
        </div>
      </div>
    `).join('');

    if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
    if (shippingEl) shippingEl.textContent = shipping === 0 ? 'FREE' : `₹${shipping}`;
    if (totalEl) totalEl.textContent = `₹${total.toLocaleString('en-IN')}`;

    if (discountLine && discountEl) {
      if (discount > 0) {
        discountLine.style.display = 'flex';
        discountEl.textContent = `-₹${discount.toLocaleString('en-IN')}`;
      } else {
        discountLine.style.display = 'none';
      }
    }

    if (freeShippingProgress) {
      if (subtotal >= threshold) {
        freeShippingProgress.innerHTML = '🎉 <strong>Congratulations!</strong> You unlocked FREE Delivery across India.';
      } else {
        const remaining = threshold - subtotal;
        freeShippingProgress.innerHTML = `Add <strong>₹${remaining.toLocaleString('en-IN')}</strong> more to get <strong>FREE Delivery</strong>!`;
      }
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-msg">${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s forwards ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Global Store Instance
const storeApp = new StoreEngine();

// ===== RENDER DYNAMIC CATALOG =====
function renderCatalog() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  const products = storeApp.getProducts();
  let filtered = products;

  // Category filter
  if (storeApp.activeCategory !== 'All') {
    filtered = filtered.filter(p => (p.category || '').toLowerCase().includes(storeApp.activeCategory.toLowerCase()));
  }

  // Search filter
  if (storeApp.searchQuery.trim()) {
    const q = storeApp.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(p => 
      (p.title || '').toLowerCase().includes(q) || 
      (p.description || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    );
  }

  // Sorting
  if (storeApp.sortBy === 'price-low') {
    filtered.sort((a, b) => a.price - b.price);
  } else if (storeApp.sortBy === 'price-high') {
    filtered.sort((a, b) => b.price - a.price);
  } else if (storeApp.sortBy === 'name') {
    filtered.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else {
    filtered.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="no-products-msg" style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
        <h3 style="font-family:'Playfair Display',serif;font-size:1.4rem;margin-bottom:0.5rem;">No Sculptures Found</h3>
        <p style="color:#6B5547;font-size:0.9rem;">Try adjusting your search terms or category filters.</p>
        <button class="btn btn-ghost btn-sm" style="margin-top:1rem;" onclick="resetCatalogFilters()">Reset Filters</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const isOutOfStock = p.stock <= 0;
    const badgeText = p.badgeTag || (p.featured ? 'Featured' : '');
    const discountPct = p.originalPrice > p.price 
      ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) 
      : 0;

    return `
      <div class="product-card" data-id="${p.id}">
        <div class="product-img-wrapper" onclick="openQuickView('${p.id}')">
          ${badgeText && badgeText !== 'Standard' ? `<div class="badge-tag">${storeApp.escapeHtml(badgeText)}</div>` : ''}
          ${discountPct > 0 ? `<div class="discount-badge">-${discountPct}%</div>` : ''}
          <img src="${p.image}" alt="${storeApp.escapeHtml(p.title)}" class="product-img" loading="lazy" onerror="this.src='Pics/749419433_1052687420627433_4165588852915451748_n.jpg'" />
          <div class="product-overlay-actions">
            <button class="overlay-btn" onclick="event.stopPropagation(); openQuickView('${p.id}');" title="Quick View">👁️ Quick View</button>
          </div>
        </div>
        <div class="product-content">
          <span class="product-category">${storeApp.escapeHtml(p.category)}</span>
          <h3 class="product-title" onclick="openQuickView('${p.id}')">${storeApp.escapeHtml(p.title)}</h3>
          <div class="product-price-row">
            <div class="price-wrap">
              <span class="product-price">₹${p.price.toLocaleString('en-IN')}</span>
              ${p.originalPrice > p.price ? `<span class="original-price">₹${p.originalPrice.toLocaleString('en-IN')}</span>` : ''}
            </div>
            <div class="stock-status ${isOutOfStock ? 'out-of-stock' : 'in-stock'}">
              ${isOutOfStock ? 'Sold Out' : (p.stock <= 3 ? `Only ${p.stock} left` : 'In Stock')}
            </div>
          </div>
          <div style="display:flex;gap:0.4rem;margin-top:0.6rem;">
            <button class="btn btn-primary btn-sm add-cart-btn ${isOutOfStock ? 'disabled' : ''}" 
              style="flex:1.2;font-size:0.82rem;padding:0.6rem 0.4rem;border-radius:8px;"
              ${isOutOfStock ? 'disabled' : ''} 
              onclick="storeApp.addToCart('${p.id}')">
              ${isOutOfStock ? 'Sold Out' : 'Add to Cart 🛍️'}
            </button>
            <button class="btn btn-sm" 
              style="flex:1;background:#E8F8EE;color:#1E7E34;border:1px solid #C3E6CB;font-weight:700;font-size:0.8rem;padding:0.6rem 0.4rem;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:3px;"
              onclick="openWhatsAppProductDirect('${storeApp.escapeHtml(p.title)}', ${p.price}, '${p.id}')"
              title="Order directly via WhatsApp">
              <span>💬 WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function resetCatalogFilters() {
  storeApp.activeCategory = 'All';
  storeApp.searchQuery = '';
  storeApp.sortBy = 'featured';
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.toggle('active', p.getAttribute('data-category') === 'All'));
  const searchInput = document.getElementById('catalogSearchInput');
  if (searchInput) searchInput.value = '';
  const sortSelect = document.getElementById('catalogSortSelect');
  if (sortSelect) sortSelect.value = 'featured';
  renderCatalog();
}

// ===== CART DRAWER CONTROLS =====
function openCart() {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartBackdrop');
  if (drawer && backdrop) {
    storeApp.updateCartUI();
    drawer.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
}

function closeCart() {
  const drawer = document.getElementById('cartDrawer');
  const backdrop = document.getElementById('cartBackdrop');
  if (drawer && backdrop) {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }
}

function applyCouponCode() {
  const input = document.getElementById('couponInput');
  if (!input) return;
  const code = input.value.trim().toUpperCase();
  const settings = storeApp.getSettings();
  const mainCode = (settings.couponCode || 'HERITAGE10').toUpperCase();
  const welCode = (settings.welcomeCouponCode || 'WELCOME5').toUpperCase();

  if (code === mainCode || code === welCode) {
    storeApp.appliedCoupon = code;
    storeApp.updateCartUI();
    storeApp.showToast(`Coupon "${code}" applied successfully!`, 'success');
  } else {
    storeApp.showToast('Invalid coupon code. Please try HERITAGE10', 'error');
  }
}

// ===== QUICK VIEW MODAL =====
function openQuickView(productId) {
  const products = storeApp.getProducts();
  const p = products.find(item => item.id === productId);
  if (!p) return;

  const modal = document.getElementById('quickViewModal');
  const container = document.getElementById('quickViewContent');
  if (!modal || !container) return;

  const isOutOfStock = p.stock <= 0;
  const discountPct = p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;

  container.innerHTML = `
    <div class="quickview-card">
      <button class="modal-close-btn" onclick="closeQuickView()" aria-label="Close">✕</button>
      <div class="quickview-grid">
        <div class="quickview-img-box">
          <img src="${p.image}" alt="${storeApp.escapeHtml(p.title)}" onerror="this.src='Pics/749419433_1052687420627433_4165588852915451748_n.jpg'" />
        </div>
        <div class="quickview-details">
          <span class="product-category">${storeApp.escapeHtml(p.category)}</span>
          <h2 style="font-family:'Playfair Display',serif;font-size:1.6rem;margin-top:0.3rem;margin-bottom:0.6rem;color:#2D221B;">${storeApp.escapeHtml(p.title)}</h2>
          <div style="display:flex;align-items:center;gap:0.8rem;margin-bottom:1rem;">
            <span style="font-size:1.4rem;font-weight:700;color:var(--color-terracotta);">₹${p.price.toLocaleString('en-IN')}</span>
            ${p.originalPrice > p.price ? `<span style="font-size:1.05rem;color:#9B8272;text-decoration:line-through;">₹${p.originalPrice.toLocaleString('en-IN')}</span>` : ''}
            ${discountPct > 0 ? `<span class="badge-tag" style="background:#E8F5E9;color:#2E7D32;border:1px solid #C8E6C9;">${discountPct}% OFF</span>` : ''}
          </div>
          <p style="font-size:0.9rem;color:#5A4A3F;line-height:1.6;margin-bottom:1.4rem;">${storeApp.escapeHtml(p.description)}</p>
          <div style="margin-bottom:1.5rem;font-size:0.85rem;color:#6B5547;">
            <div>✓ 100% Authentic Handcrafted Heritage Artwork</div>
            <div>✓ Safe 4-Tier Break-Proof Transit Packaging</div>
            <div>✓ Direct Artisan Dispatch from Kanyakumari</div>
          </div>
          <div style="display:flex;gap:0.75rem;">
            <button class="btn btn-primary" style="flex:1;" ${isOutOfStock ? 'disabled' : ''} onclick="storeApp.addToCart('${p.id}'); closeQuickView(); openCart();">
              ${isOutOfStock ? 'Sold Out' : 'Add to Cart 🛍️'}
            </button>
            <button class="btn btn-outline" onclick="openWhatsAppInquiry('${storeApp.escapeHtml(p.title)}', ${p.price})" style="color:#25D366;border-color:#25D366;">
              WhatsApp 💬
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeQuickView() {
  document.getElementById('quickViewModal')?.classList.remove('active');
  document.body.style.overflow = '';
}

function openWhatsAppInquiry(productTitle, price) {
  const settings = storeApp.getSettings();
  const phone = settings.whatsappNumber || '919944910653';
  const text = encodeURIComponent(`Hello Sree Meenakshi Handicrafts! I am interested in purchasing the "${productTitle}" (₹${price}). Please share more details.`);
  window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
}

// ===== 2-STEP CHECKOUT SYSTEM =====
function openCheckout() {
  closeCart();
  if (storeApp.cart.length === 0) {
    storeApp.showToast('Your cart is empty. Please add items before checking out.', 'error');
    return;
  }
  goToCheckoutStep(1);
  updateCheckoutSummary();
  const modal = document.getElementById('checkoutModal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeCheckout() {
  document.getElementById('checkoutModal')?.classList.remove('active');
  document.body.style.overflow = '';
}

function goToCheckoutStep(step) {
  storeApp.checkoutStep = step;
  const step1 = document.getElementById('checkoutStep1');
  const step2 = document.getElementById('checkoutStep2');
  const indicator1 = document.getElementById('stepIndicator1');
  const indicator2 = document.getElementById('stepIndicator2');

  if (step === 1) {
    if (step1) step1.style.display = 'block';
    if (step2) step2.style.display = 'none';
    indicator1?.classList.add('active');
    indicator2?.classList.remove('active');
  } else {
    const form = document.getElementById('customerDetailsForm');
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';
    indicator1?.classList.add('active');
    indicator2?.classList.add('active');
    updateCheckoutSummary();
  }
}

function selectPaymentMethod(method) {
  storeApp.selectedPaymentMethod = method;
  document.querySelectorAll('.payment-method-card').forEach(card => {
    const isThis = card.getAttribute('data-method') === method;
    card.classList.toggle('selected', isThis);
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = isThis;
  });

  const payBtn = document.getElementById('checkoutPayBtn');
  if (payBtn) {
    if (method === 'razorpay') {
      payBtn.textContent = 'Pay with Razorpay (UPI / Cards)';
    } else if (method === 'whatsapp') {
      payBtn.textContent = 'Confirm via WhatsApp Direct 💬';
    } else {
      payBtn.textContent = 'Place Order (Cash on Delivery)';
    }
  }
}

function updateCheckoutSummary() {
  const summaryList = document.getElementById('checkoutItemsReview');
  const totalAmountEl = document.getElementById('checkoutTotalReview');
  if (!summaryList || !totalAmountEl) return;

  summaryList.innerHTML = storeApp.cart.map(item => `
    <div style="display:flex;justify-content:space-between;margin-bottom:0.4rem;font-size:0.85rem;color:#4A3B32;">
      <span>${storeApp.escapeHtml(item.title)} × ${item.quantity}</span>
      <span style="font-weight:600;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
    </div>
  `).join('');

  totalAmountEl.textContent = `₹${storeApp.getCartTotal().toLocaleString('en-IN')}`;
}

// ===== PROCESS PAYMENT & DISPATCH ORDER =====
async function processOrderPayment() {
  const name = document.getElementById('custName')?.value.trim() || 'Valued Customer';
  const phone = document.getElementById('custPhone')?.value.trim() || '';
  const email = document.getElementById('custEmail')?.value.trim() || 'customer@example.com';
  const address = document.getElementById('custAddress')?.value.trim() || '';
  const city = document.getElementById('custCity')?.value.trim() || '';
  const state = document.getElementById('custState')?.value.trim() || 'Tamil Nadu';
  const pincode = document.getElementById('custPincode')?.value.trim() || '';
  const notes = document.getElementById('custNotes')?.value.trim() || '';

  if (!phone || !address || !city || !pincode) {
    storeApp.showToast('Please complete all shipping address fields.', 'error');
    goToCheckoutStep(1);
    return;
  }

  const orderId = 'SMH-' + Date.now().toString().slice(-6);
  const total = storeApp.getCartTotal();
  const subtotal = storeApp.getCartSubtotal();
  const discount = storeApp.getDiscountAmount();
  const shipping = storeApp.getShippingFee();

  const orderRecord = {
    orderId: orderId,
    date: new Date().toISOString(),
    customer: { name, phone, email, address, city, state, pincode, notes },
    items: [...storeApp.cart],
    subtotal,
    shipping,
    discount,
    total,
    paymentMethod: storeApp.selectedPaymentMethod,
    paymentStatus: storeApp.selectedPaymentMethod === 'razorpay' ? 'Paid' : 'Pending',
    status: 'Confirmed'
  };

  // WhatsApp 1-Click Order Confirmation
  if (storeApp.selectedPaymentMethod === 'whatsapp') {
    const settings = storeApp.getSettings();
    const storePhone = settings.whatsappNumber || '919944910653';
    const itemsList = storeApp.cart.map(i => `• ${i.title} (Qty: ${i.quantity}) - ₹${i.price * i.quantity}`).join('\n');
    const msg = encodeURIComponent(
      `🛍️ *NEW ORDER CONFIRMATION*\nOrder ID: #${orderId}\n\n*Customer:* ${name}\n*Phone:* ${phone}\n*Delivery Address:*\n${address}, ${city} - ${pincode}\n\n*Items Ordered:*\n${itemsList}\n\n*Grand Total:* ₹${total.toLocaleString('en-IN')}\nPayment Method: WhatsApp Confirmation`
    );
    await saveAndCompleteOrder(orderRecord);
    window.open(`https://wa.me/${storePhone}?text=${msg}`, '_blank');
    return;
  }

  // Razorpay Payment Gateway
  if (storeApp.selectedPaymentMethod === 'razorpay') {
    const settings = storeApp.getSettings();
    const keyId = settings.razorpayKey;

    if (keyId && keyId !== 'rzp_test_placeholder_key' && typeof Razorpay !== 'undefined') {
        // Try to create order from backend for proper signature verification
        const amountPaise = Math.round(total * 100);
        const backendOrder = await createRazorpayOrderFromBackend(amountPaise);
      const options = {
        key: keyId,
        amount: Math.round(total * 100),
        currency: "INR",
        name: settings.storeName || "Sree Meenakshi Handicrafts",
        description: "Order #" + orderId,
        image: "Pics/749419433_1052687420627433_4165588852915451748_n.jpg",
        handler: async function (response) {
          orderRecord.razorpayPaymentId = response.razorpay_payment_id;
          orderRecord.paymentStatus = 'Paid (Razorpay)';
          await saveAndCompleteOrder(orderRecord);
        },
        prefill: {
          name: name,
          email: email,
          contact: phone
        },
        theme: {
          color: "#C47A5A"
        },
        modal: {
          ondismiss: function() {
            storeApp.showToast('Payment window closed.', 'info');
          }
        }
      };

      try {
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function(response) {
          storeApp.showToast('Payment failed: ' + (response.error?.description || 'Declined'), 'error');
        });
        rzp.open();
        return;
      } catch (err) {
        console.warn("Razorpay popup warning:", err);
      }
    } else {
      orderRecord.paymentStatus = 'Paid (Demo / Test Mode)';
      await saveAndCompleteOrder(orderRecord);
      return;
    }
  }

  // Cash on Delivery
  orderRecord.paymentStatus = 'Pending (COD)';
  await saveAndCompleteOrder(orderRecord);
}

async function saveAndCompleteOrder(orderRecord) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: orderRecord.customer?.name || 'Valued Customer',
        phone: orderRecord.customer?.phone || '',
        email: orderRecord.customer?.email || '',
        address: orderRecord.customer?.address || '',
        city: orderRecord.customer?.city || '',
        pincode: orderRecord.customer?.pincode || '',
        orderNotice: orderRecord.customer?.notes || '',
        total: orderRecord.total,
        subtotal: orderRecord.subtotal,
        shipping: orderRecord.shipping,
        discount: orderRecord.discount,
        paymentMethod: orderRecord.paymentMethod,
        paymentStatus: orderRecord.paymentStatus,
        status: 'Confirmed',
        items: orderRecord.items,
      })
    });

    if (response.ok) {
      const created = await response.json();
      if (created && created.id) {
        orderRecord.orderId = created.id;
      }
    }
  } catch (err) {
    console.warn("Backend order sync notice (saved locally):", err);
  }

  try {
    const orders = JSON.parse(localStorage.getItem('smh_orders') || '[]');
    orders.unshift(orderRecord);
    localStorage.setItem('smh_orders', JSON.stringify(orders));
  } catch (e) {}

  storeApp.clearCart();
  closeCheckout();
  showOrderSuccessInvoice(orderRecord);
}

function showOrderSuccessInvoice(order) {
  const modal = document.getElementById('orderSuccessModal');
  const invoiceBox = document.getElementById('orderInvoiceBox');
  if (!modal || !invoiceBox) return;

  const itemsHtml = order.items.map(item => `
    <tr>
      <td>${storeApp.escapeHtml(item.title)}</td>
      <td style="text-align:center;">${item.quantity}</td>
      <td style="text-align:right;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  invoiceBox.innerHTML = `
    <div class="invoice-card" style="background:#fff;padding:2rem;border-radius:14px;max-width:550px;margin:auto;box-shadow:0 15px 35px rgba(0,0,0,0.2);">
      <div class="invoice-header" style="text-align:center;margin-bottom:1.5rem;border-bottom:1.5px solid #F0E6D6;padding-bottom:1.2rem;">
        <div style="font-size:2.5rem;margin-bottom:0.4rem;">🎉</div>
        <h2 style="font-family:'Playfair Display',serif;font-size:1.6rem;margin-bottom:0.2rem;color:#2D221B;">Order Confirmed!</h2>
        <p style="color:#6B5547;font-size:0.85rem;">Thank you for shopping with Sree Meenakshi Handicrafts.</p>
        <div style="font-weight:700;color:var(--color-terracotta);margin-top:0.4rem;font-size:0.95rem;">Order ID: ${order.orderId}</div>
      </div>

      <div style="font-size:0.85rem;line-height:1.6;margin-bottom:1.5rem;background:#FAF6F0;padding:1rem;border-radius:10px;">
        <div><strong>Customer:</strong> ${storeApp.escapeHtml(order.customer.name)} (${order.customer.phone})</div>
        <div><strong>Delivery Address:</strong> ${storeApp.escapeHtml(order.customer.address)}, ${storeApp.escapeHtml(order.customer.city)} - ${order.customer.pincode}</div>
        <div><strong>Payment:</strong> ${order.paymentMethod.toUpperCase()} (${order.paymentStatus})</div>
      </div>

      <table class="invoice-table" style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;font-size:0.85rem;">
        <thead>
          <tr style="border-bottom:1.5px solid #2D221B;text-align:left;">
            <th style="padding-bottom:0.4rem;">Item</th>
            <th style="text-align:center;padding-bottom:0.4rem;">Qty</th>
            <th style="text-align:right;padding-bottom:0.4rem;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div style="border-top:1.5px solid #2D221B;padding-top:0.8rem;display:flex;flex-direction:column;gap:0.3rem;font-size:0.9rem;">
        <div style="display:flex;justify-content:space-between;"><span>Subtotal:</span><span>₹${order.subtotal.toLocaleString('en-IN')}</span></div>
        ${order.discount > 0 ? `<div style="display:flex;justify-content:space-between;color:#2E7D32;"><span>Discount:</span><span>-₹${order.discount.toLocaleString('en-IN')}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;"><span>Shipping:</span><span>${order.shipping === 0 ? 'FREE' : '₹' + order.shipping}</span></div>
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1.15rem;color:var(--color-terracotta);margin-top:0.4rem;"><span>Grand Total:</span><span>₹${order.total.toLocaleString('en-IN')}</span></div>
      </div>

      <div style="display:flex;gap:0.75rem;margin-top:1.5rem;">
        <button class="btn btn-ghost btn-sm" style="flex:1;" onclick="window.print()">Print Invoice 🖨️</button>
        <button class="btn btn-sm" style="flex:1;background:#25D366;color:#fff;font-weight:700;border:none;border-radius:6px;cursor:pointer;" onclick="shareOrderReceiptOnWhatsApp()">Send to WhatsApp 💬</button>
        <button class="btn btn-primary btn-sm" style="flex:1;" onclick="closeOrderSuccessModal()">Continue Shopping</button>
      </div>
    </div>
  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeOrderSuccessModal() {
  document.getElementById('orderSuccessModal')?.classList.remove('active');
  document.body.style.overflow = '';
}

// ===== GALLERY LIGHTBOX =====
function initGalleryLightbox() {
  const galleryItems = document.querySelectorAll('.gallery-item');
  const lightbox = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxFullImg');

  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (img && lightbox && lightboxImg) {
        lightboxImg.src = img.src;
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    });
  });
}

function closeGalleryLightbox() {
  document.getElementById('lightboxModal')?.classList.remove('active');
  document.body.style.overflow = '';
}

// ===== CONTACT FORM ENQUIRIES =====
async function handleContactForm(e) {
  e.preventDefault();
  const name = document.getElementById('enquiryName')?.value.trim();
  const phone = document.getElementById('enquiryPhone')?.value.trim();
  const interest = document.getElementById('enquiryInterest')?.value;
  const message = document.getElementById('enquiryMessage')?.value.trim();

  if (!name || !phone) {
    storeApp.showToast('Please fill in your name and phone number.', 'error');
    return;
  }

  try {
    await fetch(`${API_BASE_URL}/api/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, interest, message })
    });
  } catch (err) {
    console.warn("Contact form notice:", err);
  }

  storeApp.showToast('Thank you! Your enquiry has been received. Our master artisans will contact you shortly.', 'success');
  e.target.reset();
}

// ===== RENDER DYNAMIC FAQS =====
function renderFaqs() {
  const container = document.getElementById('faqGridContainer');
  if (!container) return;

  const faqs = storeApp.getFaqs();
  if (faqs.length === 0) return;

  container.innerHTML = faqs.map((faq, idx) => `
    <div class="faq-card ${idx === 0 ? 'open' : ''}">
      <div class="faq-question">
        <span>${storeApp.escapeHtml(faq.question)}</span>
        <span class="faq-toggle-icon">+</span>
      </div>
      <div class="faq-answer">
        ${storeApp.escapeHtml(faq.answer)}
      </div>
    </div>
  `).join('');

  container.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', () => {
      const card = q.parentElement;
      card.classList.toggle('open');
    });
  });
}

function renderTopBanner() {
  const settings = storeApp.getSettings();
  const banner1 = document.getElementById('topBannerText1');
  const bannerHigh = document.getElementById('topBannerHighlight');
  if (banner1 && settings.topBannerText1) banner1.textContent = settings.topBannerText1;
  if (bannerHigh && settings.topBannerHighlight) bannerHigh.textContent = settings.topBannerHighlight;
}

function updateStoreContactDetails() {
  const settings = storeApp.getSettings();
  const waLinks = document.querySelectorAll('a[href*="wa.me"]');
  if (settings.whatsappNumber) {
    waLinks.forEach(link => {
      const url = new URL(link.href);
      url.pathname = `/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`;
      link.href = url.toString();
    });
  }
}

// ===== DOM INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  storeApp.updateCartUI();
  renderCatalog();
  renderFaqs();
  renderTopBanner();
  initGalleryLightbox();

  // Category filter pills
  document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      storeApp.activeCategory = pill.getAttribute('data-category') || 'All';
      renderCatalog();
    });
  });

  // Search input
  const searchInput = document.getElementById('catalogSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      storeApp.searchQuery = e.target.value;
      renderCatalog();
    });
  }

  // Sort select
  const sortSelect = document.getElementById('catalogSortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      storeApp.sortBy = e.target.value;
      renderCatalog();
    });
  }

  // Navbar sticky blur effect
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  // Contact form submit
  const contactForm = document.getElementById('artisanContactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactForm);
  }
});


// ===== BACKEND-POWERED RAZORPAY ORDER CREATION =====
async function createRazorpayOrderFromBackend(amountInPaise) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: 'smh_' + Date.now()
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Backend order creation failed');
    }
    return await res.json();
  } catch (e) {
    console.warn('Backend Razorpay order creation error:', e.message);
    return null;
  }
}

async function verifyRazorpayPaymentOnBackend(razorpay_order_id, razorpay_payment_id, razorpay_signature) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/payment/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ razorpay_order_id, razorpay_payment_id, razorpay_signature })
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success === true;
  } catch (e) {
    console.warn('Payment verify error:', e.message);
    return false;
  }
}


// ===== SYNC SETTINGS FROM BACKEND =====
async function syncSettingsFromBackend() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/settings`);
    if (!res.ok) return;
    const remote = await res.json();
    // Merge backend settings into storeApp (backend is authoritative)
    Object.assign(storeApp.state.settings, remote);
    localStorage.setItem('krishika_settings', JSON.stringify(storeApp.state.settings));
    // Re-apply dynamic UI
    renderTopBanner();
    updateStoreContactDetails();
    // Show/hide Razorpay payment option based on admin toggle
    const rzpCard = document.querySelector('.payment-method-card[data-method="razorpay"]');
    if (rzpCard) {
      rzpCard.style.display = remote.razorpayEnabled ? '' : 'none';
    }
    // If Razorpay is disabled, default to WhatsApp
    if (!remote.razorpayEnabled && storeApp.selectedPaymentMethod === 'razorpay') {
      selectPaymentMethod('whatsapp');
    }
  } catch (e) {
    console.warn('Could not sync settings from backend:', e.message);
  }
}

// ===== DIRECT 1-CLICK WHATSAPP CHECKOUT & PRODUCT INQUIRY =====
function openWhatsAppProductDirect(productTitle, price, productId) {
  const settings = storeApp.getSettings();
  const phone = settings.whatsappNumber || '919944910653';
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const msg = encodeURIComponent(
    `🛍️ *PRODUCT ORDER INQUIRY*\n\nHello Sree Meenakshi Handicrafts! I would like to order this handcrafted item:\n\n• *${productTitle}*\n• Price: ₹${price.toLocaleString('en-IN')}\n\nPlease confirm availability and share your UPI / GPay details to place this order!`
  );
  window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
}

async function checkoutViaWhatsAppDirect() {
  if (storeApp.cart.length === 0) {
    storeApp.showToast('Your cart is empty. Please add items before checking out.', 'error');
    return;
  }

  const settings = storeApp.getSettings();
  const storePhone = (settings.whatsappNumber || '919944910653'