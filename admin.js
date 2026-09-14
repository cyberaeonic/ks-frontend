/**
 * SREE MEENAKSHI HANDICRAFTS & KRISHIKA STORE
 * Admin Dashboard Engine (admin.js)
 * Features: Product CRUD, Orders Management, Image Uploader, Store Settings, Dynamic FAQs, Analytics
 * Integrated with Node.js / Express REST API Backend
 */

const API_BASE_URL = window.API_BASE_URL || 'http://localhost:3001';

class AdminDashboard {
  constructor() {
    this.activeTab = 'dashboard';
    this.editingProductId = null;
    this.editingFaqId = null;
    this.failedLoginAttempts = 0;
    this.lockoutUntil = 0;

    this.products = [];
    this.orders = [];
    this.faqs = [];
    this.inquiries = [];
    this.settings = {};

    this.initAuth();
  }

  // ===== AUTHENTICATION & SECURITY =====
  initAuth() {
    const sessionToken = sessionStorage.getItem('smh_admin_token');
    const authOverlay = document.getElementById('authOverlay');

    if (sessionToken && this.validateToken(sessionToken)) {
      if (authOverlay) authOverlay.classList.add('hidden');
      this.initDashboard();
    } else {
      if (authOverlay) authOverlay.classList.remove('hidden');
    }
  }

  async hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async login(password) {
    const now = Date.now();
    if (this.lockoutUntil > now) {
      const waitSec = Math.ceil((this.lockoutUntil - now) / 1000);
      this.showAuthError(`Too many failed attempts. Please wait ${waitSec}s.`);
      return;
    }

    const settings = this.getSettings();
    const correctPin = settings.adminPin || 'admin123';

    if (password === correctPin) {
      const token = await this.hashString(password + '_' + now);
      sessionStorage.setItem('smh_admin_token', token);
      sessionStorage.setItem('smh_auth_timestamp', now.toString());

      const authOverlay = document.getElementById('authOverlay');
      if (authOverlay) authOverlay.classList.add('hidden');

      this.failedLoginAttempts = 0;
      this.initDashboard();
      this.showToast('Welcome back, Admin!', 'success');
    } else {
      this.failedLoginAttempts++;
      if (this.failedLoginAttempts >= 4) {
        this.lockoutUntil = Date.now() + 30000;
        this.showAuthError('Too many failed attempts. Locked for 30 seconds.');
      } else {
        this.showAuthError(`Incorrect PIN. Attempt ${this.failedLoginAttempts}/4.`);
      }
    }
  }

  logout() {
    sessionStorage.removeItem('smh_admin_token');
    sessionStorage.removeItem('smh_auth_timestamp');
    window.location.reload();
  }

  validateToken(token) {
    const timestamp = parseInt(sessionStorage.getItem('smh_auth_timestamp') || '0', 10);
    const maxAge = 24 * 60 * 60 * 1000;
    return Date.now() - timestamp < maxAge;
  }

  showAuthError(msg) {
    const errEl = document.getElementById('authError');
    if (errEl) {
      errEl.textContent = msg;
      errEl.style.display = 'block';
    }
  }

  // ===== INITIALIZATION =====
  async initDashboard() {
    await this.refreshAllData();
    this.initNavigation();
    this.initImageUploadHandler();
    this.initBroadcastSync();
  }

  initBroadcastSync() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const syncChannel = new BroadcastChannel('smh_store_sync');
        syncChannel.onmessage = (event) => {
          if (event.data?.type === 'ORDER_PLACED') {
            this.loadOrders();
          }
        };
      } catch (e) {}
    }
  }

  broadcastUpdate(type, data) {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const syncChannel = new BroadcastChannel('smh_store_sync');
        syncChannel.postMessage({ type, ...data });
      } catch (e) {}
    }
  }

  async refreshAllData() {
    await Promise.allSettled([
      this.loadSettings(),
      this.loadProducts(),
      this.loadOrders(),
      this.loadFaqs(),
      this.loadEnquiries()
    ]);
    this.updateMetrics();
  }

  // ===== DATA RETRIEVAL =====
  async loadProducts() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/products?mode=admin`);
      if (res.ok) {
        this.products = await res.json();
      }
    } catch (e) {
      console.warn('Backend loadProducts warning:', e);
      this.products = JSON.parse(localStorage.getItem('smh_products') || '[]');
    }
    this.renderProductsTable();
    this.updateMetrics();
  }

  getProducts() {
    return this.products;
  }

  async loadOrders() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`);
      if (res.ok) {
        this.orders = await res.json();
      }
    } catch (e) {
      console.warn('Backend loadOrders warning:', e);
      this.orders = JSON.parse(localStorage.getItem('smh_orders') || '[]');
    }
    this.renderOrdersTable();
    this.updateMetrics();
  }

  getOrders() {
    return this.orders;
  }

  async loadFaqs() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/faqs`);
      if (res.ok) {
        this.faqs = await res.json();
      }
    } catch (e) {
      console.warn('Backend loadFaqs warning:', e);
      this.faqs = JSON.parse(localStorage.getItem('smh_faqs') || '[]');
    }
    this.renderFaqsTable();
  }

  getFaqs() {
    return this.faqs;
  }

  async loadSettings() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`);
      if (res.ok) {
        this.settings = await res.json();
      }
    } catch (e) {
      console.warn('Backend loadSettings warning:', e);
      this.settings = JSON.parse(localStorage.getItem('smh_settings') || '{}');
    }
    this.loadSettingsForm();
  }

  getSettings() {
    return this.settings;
  }

  async loadEnquiries() {
    try {
      const res = await fetch(`${API_BASE_URL}/api/enquiries`);
      if (res.ok) {
        this.inquiries = await res.json();
      }
    } catch (e) {
      console.warn('Backend loadEnquiries warning:', e);
      this.inquiries = JSON.parse(localStorage.getItem('smh_inquiries') || '[]');
    }
    this.renderInquiriesTable();
  }

  async syncEnquiriesFromBackend() {
    try {
      const res = await fetch(`${this.API_BASE_URL || API_BASE_URL}/api/enquiries`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // Merge: use backend as truth, but keep any local-only entries
        const existing = this.getInquiries();
        const backendIds = new Set(data.map(e => e.id));
        const localOnly = existing.filter(e => !backendIds.has(e.id));
        const merged = [...data, ...localOnly];
        localStorage.setItem('krishika_enquiries', JSON.stringify(merged));
        this.renderInquiriesTable();
      }
    } catch (e) {
      console.warn('Enquiries sync error:', e);
    }
  }

  getInquiries() {
    return this.inquiries;
  }

  // ===== NAVIGATION & TABS =====
  initNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.getAttribute('data-tab');
        if (tab) this.switchTab(tab);
      });
    });
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-tab') === tabName);
    });

    document.querySelectorAll('.admin-section').forEach(section => {
      section.classList.toggle('active', section.id === `section-${tabName}`);
    });

    if (tabName === 'products') this.renderProductsTable();
    else if (tabName === 'orders') this.renderOrdersTable();
    else if (tabName === 'faqs') this.renderFaqsTable();
    else if (tabName === 'inquiries') this.renderInquiriesTable();
    else if (tabName === 'settings') this.loadSettingsForm();
  }

  // ===== METRICS & STATS =====
  updateMetrics() {
    const products = this.getProducts();
    const orders = this.getOrders();

    const totalProductsEl = document.getElementById('metricTotalProducts');
    const totalOrdersEl = document.getElementById('metricTotalOrders');
    const revenueEl = document.getElementById('metricRevenue');
    const outOfStockEl = document.getElementById('metricOutOfStock');

    const outOfStockCount = products.filter(p => (p.stock || p.inStock) <= 0).length;
    const totalRev = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    if (totalProductsEl) totalProductsEl.textContent = products.length;
    if (totalOrdersEl) totalOrdersEl.textContent = orders.length;
    if (revenueEl) revenueEl.textContent = `₹${totalRev.toLocaleString('en-IN')}`;
    if (outOfStockEl) outOfStockEl.textContent = outOfStockCount;
  }

  // ===== PRODUCTS MANAGEMENT =====
  renderProductsTable(searchQuery = '', categoryFilter = 'all') {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    let products = this.getProducts();

    if (categoryFilter !== 'all') {
      products = products.filter(p => (p.category || '').toLowerCase() === categoryFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      products = products.filter(p => 
        (p.title || '').toLowerCase().includes(q) || 
        (p.id || '').toLowerCase().includes(q) ||
        (p.category || '').toLowerCase().includes(q)
      );
    }

    if (products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center;padding:2.5rem;color:#6C757D;">
            No products found. Click <strong>"+ Add Product"</strong> to create a new item.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = products.map((p, idx) => `
      <tr>
        <td style="text-align:center;">
          <div style="display:flex;flex-direction:column;gap:2px;align-items:center;">
            <button class="action-btn" onclick="adminApp.moveProductUp(${idx})" title="Move Up" ${idx === 0 ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''}>▲</button>
            <button class="action-btn" onclick="adminApp.moveProductDown(${idx})" title="Move Down" ${idx === products.length - 1 ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : ''}>▼</button>
          </div>
        </td>
        <td>
          <img src="${p.image}" alt="${this.escapeHtml(p.title)}" class="table-img" onerror="this.src='Pics/749419433_1052687420627433_4165588852915451748_n.jpg'" />
        </td>
        <td>
          <strong>${this.escapeHtml(p.title)}</strong>
          <div style="font-size:0.75rem;color:#6C757D;">ID: ${p.id}</div>
        </td>
        <td><span class="badge-status" style="background:#F0E6D6;color:#6B5444;">${this.escapeHtml(p.category)}</span></td>
        <td>
          <strong>₹${p.price.toLocaleString('en-IN')}</strong>
          ${p.originalPrice > p.price ? `<div style="font-size:0.75rem;color:#9B8272;text-decoration:line-through;">₹${p.originalPrice.toLocaleString('en-IN')}</div>` : ''}
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:0.3rem;">
            <button class="action-btn" onclick="adminApp.adjustStock('${p.id}', -1)" style="padding:2px 6px;font-size:0.75rem;" title="Decrease Stock">-</button>
            <span class="badge-status ${p.stock > 0 ? 'badge-delivered' : 'badge-cancelled'}" style="font-weight:700;">
              ${p.stock}
            </span>
            <button class="action-btn" onclick="adminApp.adjustStock('${p.id}', 1)" style="padding:2px 6px;font-size:0.75rem;" title="Increase Stock">+</button>
          </div>
        </td>
        <td>
          ${p.badgeTag && p.badgeTag !== 'Standard' ? `<span style="background:#FFF3E0;color:#E65100;padding:2px 8px;border-radius:12px;font-size:0.75rem;font-weight:700;border:1px solid #FFE0B2;">${this.escapeHtml(p.badgeTag)}</span>` : (p.featured ? '<span style="color:#D4AF37;font-weight:700;font-size:0.8rem;">★ Featured</span>' : '<span style="color:#A09084;font-size:0.8rem;">Standard</span>')}
        </td>
        <td>
          <div class="action-btn-group">
            <button class="action-btn" onclick="adminApp.openEditProductModal('${p.id}')" title="Edit Product">✏️</button>
            <button class="action-btn action-btn-danger" onclick="adminApp.deleteProduct('${p.id}')" title="Delete Product">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  async adjustStock(productId, delta) {
    const products = this.getProducts();
    const p = products.find(item => item.id === productId);
    if (!p) return;

    const newStock = Math.max(0, (p.stock || 0) + delta);
    p.stock = newStock;
    this.renderProductsTable();

    try {
      await fetch(`${API_BASE_URL}/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: newStock })
      });
      this.broadcastUpdate('PRODUCTS_UPDATED');
      this.showToast(`Stock for "${p.title}" set to ${newStock}`, 'info');
    } catch (e) {
      console.warn("Stock update error:", e);
    }
  }

  moveProductUp(index) {
    if (index > 0) {
      const temp = this.products[index];
      this.products[index] = this.products[index - 1];
      this.products[index - 1] = temp;
      this.renderProductsTable();
    }
  }

  moveProductDown(index) {
    if (index < this.products.length - 1) {
      const temp = this.products[index];
      this.products[index] = this.products[index + 1];
      this.products[index + 1] = temp;
      this.renderProductsTable();
    }
  }

  openAddProductModal() {
    this.editingProductId = null;
    const form = document.getElementById('productForm');
    const titleEl = document.getElementById('productModalTitle');
    const preview = document.getElementById('productImagePreview');
    const fileInput = document.getElementById('prodImageFileInput');

    if (form) form.reset();
    if (fileInput) fileInput.value = '';
    if (titleEl) titleEl.textContent = 'Add New Handcrafted Sculpture';
    if (preview) preview.innerHTML = '<span style="color:#8A7564;font-size:0.85rem;">Upload Image or Enter URL</span>';

    const modal = document.getElementById('productModal');
    if (modal) modal.classList.add('active');
  }

  openEditProductModal(productId) {
    const products = this.getProducts();
    const p = products.find(item => item.id === productId);
    if (!p) return;

    this.editingProductId = productId;
    const titleEl = document.getElementById('productModalTitle');
    if (titleEl) titleEl.textContent = 'Edit Product & Pricing';

    document.getElementById('prodTitleInput').value = p.title || '';
    document.getElementById('prodCategoryInput').value = p.category || 'Wood & Brass';
    document.getElementById('prodPriceInput').value = p.price || 0;
    document.getElementById('prodOriginalPriceInput').value = p.originalPrice || 0;
    document.getElementById('prodStockInput').value = p.stock || 10;
    document.getElementById('prodDescInput').value = p.description || '';
    document.getElementById('prodImageUrlInput').value = p.image || '';
    if (document.getElementById('prodBadgeSelect')) {
      document.getElementById('prodBadgeSelect').value = p.badgeTag || (p.featured ? 'Featured' : 'Standard');
    }
    document.getElementById('prodFeaturedInput').checked = !!p.featured;

    const preview = document.getElementById('productImagePreview');
    if (preview) {
      preview.innerHTML = `<img src="${p.image}" alt="Preview" onerror="this.src='Pics/749419433_1052687420627433_4165588852915451748_n.jpg'" />`;
    }

    const modal = document.getElementById('productModal');
    if (modal) modal.classList.add('active');
  }

  initImageUploadHandler() {
    const fileInput = document.getElementById('prodImageFileInput');
    const urlInput = document.getElementById('prodImageUrlInput');
    const preview = document.getElementById('productImagePreview');

    if (fileInput) {
      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview immediately via local object URL
        if (preview) {
          preview.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Uploading..." style="opacity:0.6;" />`;
        }

        // Upload to backend
        try {
          const formData = new FormData();
          formData.append('image', file);

          const res = await fetch(`${API_BASE_URL}/api/upload`, {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (urlInput) urlInput.value = data.url;
            if (preview) {
              preview.innerHTML = `<img src="${data.url}" alt="Uploaded" />`;
            }
            this.showToast('Image uploaded successfully!', 'success');
          } else {
            throw new Error('Upload failed');
          }
        } catch (err) {
          console.error('Image upload failed:', err);
          this.showToast('Could not upload image to server, using local preview.', 'error');
        }
      });
    }

    if (urlInput) {
      urlInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        if (val && preview) {
          preview.innerHTML = `<img src="${val}" alt="Preview" onerror="this.src='Pics/749419433_1052687420627433_4165588852915451748_n.jpg'" />`;
        }
      });
    }
  }

  async saveProductFromForm(e) {
    e.preventDefault();
    const title = document.getElementById('prodTitleInput')?.value.trim();
    const category = document.getElementById('prodCategoryInput')?.value.trim();
    const price = parseFloat(document.getElementById('prodPriceInput')?.value) || 0;
    const originalPrice = parseFloat(document.getElementById('prodOriginalPriceInput')?.value) || price;
    const stock = parseInt(document.getElementById('prodStockInput')?.value, 10) || 0;
    const description = document.getElementById('prodDescInput')?.value.trim();
    let image = document.getElementById('prodImageUrlInput')?.value.trim();
    const badgeSelect = document.getElementById('prodBadgeSelect');
    const badgeTag = badgeSelect ? badgeSelect.value : 'Standard';
    const featured = document.getElementById('prodFeaturedInput')?.checked || badgeTag === 'Featured';

    if (!title) { this.showToast('Please enter a product title.', 'error'); return; }
    if (price <= 0) { this.showToast('Please enter a valid price.', 'error'); return; }

    if (!image) {
      image = 'Pics/749419433_1052687420627433_4165588852915451748_n.jpg';
    }

    const payload = {
      title,
      category,
      price,
      originalPrice,
      stock,
      description,
      image,
      badgeTag,
      featured
    };

    try {
      if (this.editingProductId) {
        const res = await fetch(`${API_BASE_URL}/api/products/${this.editingProductId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to update product');
        this.showToast('Product updated successfully!', 'success');
      } else {
        const res = await fetch(`${API_BASE_URL}/api/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Failed to create product');
        this.showToast('New product added to catalog!', 'success');
      }

      this.closeProductModal();
      await this.loadProducts();
      this.broadcastUpdate('PRODUCTS_UPDATED');
    } catch (err) {
      console.error('Save product error:', err);
      this.showToast('Error saving product to backend database.', 'error');
    }
  }

  async deleteProduct(productId) {
    if (!confirm('Are you sure you want to remove this product from the store catalog?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/products/${productId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        this.showToast('Product deleted', 'info');
        await this.loadProducts();
        this.broadcastUpdate('PRODUCTS_UPDATED');
      } else {
        throw new Error('Delete failed');
      }
    } catch (err) {
      console.error('Delete product error:', err);
      this.showToast('Could not delete product.', 'error');
    }
  }

  closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('active');
  }

  // ===== FAQ CRUD =====
  renderFaqsTable() {
    const tbody = document.getElementById('faqsTableBody');
    if (!tbody) return;

    const faqs = this.getFaqs();
    if (faqs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center;padding:2.5rem;color:#6C757D;">
            No FAQs yet. Click <strong>"+ Add FAQ Question"</strong> to create one.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = faqs.map((faq, idx) => `
      <tr>
        <td style="text-align:center;width:60px;"><strong>#${idx + 1}</strong></td>
        <td style="font-weight:700;color:#2D221B;max-width:280px;">${this.escapeHtml(faq.question)}</td>
        <td style="font-size:0.85rem;color:#5A4A3F;line-height:1.5;">${this.escapeHtml(faq.answer)}</td>
        <td style="text-align:right;width:120px;">
          <div class="action-btn-group" style="justify-content:flex-end;">
            <button class="action-btn" onclick="adminApp.openEditFaqModal('${faq.id}')" title="Edit">✏️</button>
            <button class="action-btn action-btn-danger" onclick="adminApp.deleteFaq('${faq.id}')" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  openAddFaqModal() {
    this.editingFaqId = null;
    const form = document.getElementById('faqForm');
    const titleEl = document.getElementById('faqModalTitle');
    if (form) form.reset();
    if (titleEl) titleEl.textContent = 'Add FAQ Question';
    const modal = document.getElementById('faqModal');
    if (modal) modal.classList.add('active');
  }

  openEditFaqModal(faqId) {
    const faqs = this.getFaqs();
    const faq = faqs.find(f => f.id === faqId);
    if (!faq) return;

    this.editingFaqId = faqId;
    const titleEl = document.getElementById('faqModalTitle');
    if (titleEl) titleEl.textContent = 'Edit FAQ Question';
    const qEl = document.getElementById('faqQuestionInput');
    const aEl = document.getElementById('faqAnswerInput');
    if (qEl) qEl.value = faq.question;
    if (aEl) aEl.value = faq.answer;

    const modal = document.getElementById('faqModal');
    if (modal) modal.classList.add('active');
  }

  async saveFaqFromForm(e) {
    e.preventDefault();
    const question = document.getElementById('faqQuestionInput')?.value.trim();
    const answer = document.getElementById('faqAnswerInput')?.value.trim();
    if (!question || !answer) {
      this.showToast('Please fill in both question and answer.', 'error');
      return;
    }

    try {
      if (this.editingFaqId) {
        await fetch(`${API_BASE_URL}/api/faqs/${this.editingFaqId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, answer })
        });
        this.showToast('FAQ updated!', 'success');
      } else {
        await fetch(`${API_BASE_URL}/api/faqs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, answer })
        });
        this.showToast('FAQ added to storefront!', 'success');
      }
      this.closeFaqModal();
      await this.loadFaqs();
      this.broadcastUpdate('FAQS_UPDATED');
    } catch (err) {
      console.error('FAQ save error:', err);
      this.showToast('Failed to save FAQ to backend.', 'error');
    }
  }

  async deleteFaq(faqId) {
    if (!confirm('Remove this FAQ from the storefront?')) return;
    try {
      await fetch(`${API_BASE_URL}/api/faqs/${faqId}`, { method: 'DELETE' });
      this.showToast('FAQ removed', 'info');
      await this.loadFaqs();
      this.broadcastUpdate('FAQS_UPDATED');
    } catch (err) {
      console.error('FAQ delete error:', err);
    }
  }

  closeFaqModal() {
    const modal = document.getElementById('faqModal');
    if (modal) modal.classList.remove('active');
    this.editingFaqId = null;
  }

  // ===== ORDERS MANAGEMENT =====
  renderOrdersTable(filterStatus = 'all', searchQuery = '') {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    let orders = this.getOrders();

    if (filterStatus !== 'all') {
      orders = orders.filter(o => (o.status || '').toLowerCase() === filterStatus.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      orders = orders.filter(o => 
        (o.orderId || '').toLowerCase().includes(q) || 
        (o.customer?.name || '').toLowerCase().includes(q) ||
        (o.customer?.phone || '').includes(q) ||
        (o.customer?.city || '').toLowerCase().includes(q)
      );
    }

    if (orders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:2.5rem;color:#6C757D;">
            No orders found matching the filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = orders.map(o => {
      const dateFormatted = o.date ? new Date(o.date).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }) : 'Recent';

      const custName = o.customer ? this.escapeHtml(o.customer.name || 'Valued Customer') : 'Valued Customer';
      const custPhone = o.customer ? (o.customer.phone || 'N/A') : (o.phone || 'N/A');
      const custAddress = o.customer 
        ? `${o.customer.address || ''}, ${o.customer.city || ''} ${o.customer.pincode ? '- ' + o.customer.pincode : ''}`
        : (o.address || 'Address on file');

      let paymentBadgeHtml = '';
      const pMethod = (o.paymentMethod || 'razorpay').toLowerCase();
      const pStatus = (o.paymentStatus || 'Pending').toLowerCase();

      if (pMethod.includes('razorpay') || pStatus.includes('paid')) {
        paymentBadgeHtml = `
          <span style="background:#E8F5E9;color:#2E7D32;padding:4px 10px;border-radius:12px;font-size:0.78rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;border:1px solid #C8E6C9;">
            ✓ Razorpay Paid
          </span>
        `;
      } else if (pMethod.includes('whatsapp')) {
        paymentBadgeHtml = `
          <span style="background:#E0F7FA;color:#00838F;padding:4px 10px;border-radius:12px;font-size:0.78rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;border:1px solid #B2EBF2;">
            💬 WhatsApp Order
          </span>
        `;
      } else {
        paymentBadgeHtml = `
          <span style="background:#FFF3E0;color:#E65100;padding:4px 10px;border-radius:12px;font-size:0.78rem;font-weight:700;display:inline-flex;align-items:center;gap:4px;border:1px solid #FFE0B2;">
            📦 COD / Pending
          </span>
        `;
      }

      return `
        <tr>
          <td>
            <strong>#${o.orderId}</strong>
            <div style="font-size:0.75rem;color:#6C757D;">${dateFormatted}</div>
          </td>
          <td>
            <div style="font-weight:700;color:#2D221B;">${custName}</div>
            <div style="font-size:0.78rem;color:#6C757D;display:flex;align-items:center;gap:0.3rem;margin-top:2px;">
              📞 <span>${custPhone}</span>
            </div>
          </td>
          <td style="max-width:220px;font-size:0.8rem;line-height:1.4;color:#4A3B32;">
            <div style="display:flex;gap:0.3rem;">
              <span>📍</span>
              <span>${this.escapeHtml(custAddress)}</span>
            </div>
          </td>
          <td>${paymentBadgeHtml}</td>
          <td>
            <strong style="color:var(--color-terracotta);font-size:0.95rem;">₹${(o.total || 0).toLocaleString('en-IN')}</strong>
            <div style="font-size:0.75rem;color:#6C757D;">${(o.items || []).length} item(s)</div>
          </td>
          <td>
            <select class="admin-select" onchange="adminApp.updateOrderStatus('${o.orderId}', this.value)" style="font-size:0.78rem;font-weight:700;">
              <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
              <option value="Confirmed" ${o.status === 'Confirmed' ? 'selected' : ''}>✓ Confirmed</option>
              <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>⚙️ Processing</option>
              <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>🚚 Shipped</option>
              <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>✅ Delivered</option>
              <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>✕ Cancelled</option>
            </select>
          </td>
          <td>
            <div class="action-btn-group">
              <button class="action-btn" onclick="adminApp.viewOrderDetails('${o.orderId}')" title="View Full Details">👁️</button>
              <button class="action-btn" onclick="adminApp.openCustomerWhatsApp('${custPhone}', '${o.orderId}')" title="Chat on WhatsApp" style="color:#25D366;">💬</button>
              <button class="action-btn action-btn-danger" onclick="adminApp.deleteOrder('${o.orderId}')" title="Delete Order">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  async updateOrderStatus(orderId, newStatus) {
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        this.showToast(`Order #${orderId} status updated to ${newStatus}`, 'success');
        await this.loadOrders();
      }
    } catch (e) {
      console.warn("Update status warning:", e);
    }
  }

  async deleteOrder(orderId) {
    if (!confirm(`Are you sure you want to delete order #${orderId}?`)) return;
    try {
      await fetch(`${API_BASE_URL}/api/orders/${orderId}`, { method: 'DELETE' });
      this.showToast('Order deleted', 'info');
      await this.loadOrders();
    } catch (e) {
      console.warn("Delete order warning:", e);
    }
  }

  viewOrderDetails(orderId) {
    const orders = this.getOrders();
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return;

    const modal = document.getElementById('orderDetailsModal');
    const content = document.getElementById('orderDetailsContent');
    if (!modal || !content) return;

    const itemsHtml = (order.items || []).map(item => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.6rem 0;border-bottom:1px dashed #EFE7DE;font-size:0.85rem;">
        <div>
          <strong>${this.escapeHtml(item.title)}</strong>
          <div style="font-size:0.75rem;color:#6C757D;">Qty: ${item.quantity} × ₹${item.price.toLocaleString('en-IN')}</div>
        </div>
        <div style="font-weight:700;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</div>
      </div>
    `).join('');

    const cust = order.customer || {};

    content.innerHTML = `
      <div style="margin-bottom:1.2rem;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <h3 style="font-family:'Playfair Display',serif;font-size:1.3rem;">Order #${order.orderId}</h3>
          <span class="badge-status badge-delivered">${(order.paymentMethod || 'Razorpay').toUpperCase()}</span>
        </div>
        <p style="font-size:0.8rem;color:#6C757D;">Placed on ${new Date(order.date).toLocaleString('en-IN')}</p>
      </div>

      <div style="background:#F8F9FA;padding:1rem;border-radius:10px;margin-bottom:1.2rem;font-size:0.85rem;line-height:1.5;">
        <div><strong>Customer Name:</strong> ${this.escapeHtml(cust.name || order.name || 'Guest')}</div>
        <div><strong>Phone:</strong> ${cust.phone || order.phone || 'N/A'}</div>
        <div><strong>Email:</strong> ${cust.email || order.email || 'N/A'}</div>
        <div style="margin-top:0.4rem;"><strong>Shipping Address:</strong><br />${this.escapeHtml(cust.address || order.address || '')}, ${this.escapeHtml(cust.city || order.city || '')} - ${this.escapeHtml(cust.pincode || '')}</div>
      </div>

      <div style="margin-bottom:1.2rem;">
        <h4 style="font-size:0.95rem;margin-bottom:0.6rem;">Items Ordered</h4>
        ${itemsHtml}
      </div>

      <div style="display:flex;flex-direction:column;gap:0.3rem;font-size:0.9rem;border-top:1.5px solid #2D221B;padding-top:0.8rem;">
        <div style="display:flex;justify-content:space-between;"><span>Subtotal:</span><span>₹${(order.subtotal || order.total).toLocaleString('en-IN')}</span></div>
        ${order.discount > 0 ? `<div style="display:flex;justify-content:space-between;color:#2E7D32;"><span>Discount:</span><span>-₹${order.discount.toLocaleString('en-IN')}</span></div>` : ''}
        <div style="display:flex;justify-content:space-between;"><span>Delivery:</span><span>${order.shipping === 0 ? 'FREE' : '₹' + order.shipping}</span></div>
        <div style="display:flex;justify-content:space-between;font-weight:700;font-size:1.1rem;color:var(--color-terracotta);margin-top:0.4rem;"><span>Total Amount:</span><span>₹${order.total.toLocaleString('en-IN')}</span></div>
      </div>
    `;

    modal.classList.add('active');
  }

  closeOrderDetailsModal() {
    const modal = document.getElementById('orderDetailsModal');
    if (modal) modal.classList.remove('active');
  }

  openCustomerWhatsApp(phone, orderId) {
    const cleanPhone = (phone || '').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(`Hello! We are contacting you regarding your Sree Meenakshi Handicrafts Order #${orderId}.`);
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  }

  exportOrdersToCSV() {
    const orders = this.getOrders();
    if (orders.length === 0) {
      this.showToast('No orders to export.', 'error');
      return;
    }

    const headers = ['Order ID', 'Date', 'Customer Name', 'Phone', 'Email', 'Address', 'City', 'Payment Method', 'Status', 'Total (INR)'];
    const rows = orders.map(o => [
      o.orderId,
      new Date(o.date).toISOString().split('T')[0],
      `"${(o.customer?.name || o.name || '').replace(/"/g, '""')}"`,
      `"${o.customer?.phone || o.phone || ''}"`,
      `"${o.customer?.email || o.email || ''}"`,
      `"${(o.customer?.address || o.address || '').replace(/"/g, '""')}"`,
      `"${o.customer?.city || o.city || ''}"`,
      o.paymentMethod || 'Razorpay',
      o.status || 'Pending',
      o.total || 0
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    this.showToast('Exported orders to CSV!', 'success');
  }

  // ===== INQUIRIES MANAGEMENT =====
  renderInquiriesTable() {
    const tbody = document.getElementById('inquiriesTableBody');
    if (!tbody) return;

    const inquiries = this.getInquiries();
    if (inquiries.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;padding:2.5rem;color:#6C757D;">
            No customer inquiries yet.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = inquiries.map(inq => `
      <tr>
        <td style="font-size:0.8rem;color:#6C757D;">${new Date(inq.createdAt || Date.now()).toLocaleDateString('en-IN')}</td>
        <td><strong>${this.escapeHtml(inq.name)}</strong></td>
        <td>${inq.phone}</td>
        <td><span class="badge-status" style="background:#F0E6D6;color:#6B5444;">${this.escapeHtml(inq.interest || 'General')}</span></td>
        <td style="max-width:240px;font-size:0.82rem;color:#6C757D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${this.escapeHtml(inq.message)}
        </td>
        <td>
          <div class="action-btn-group">
            <button class="action-btn" onclick="adminApp.openCustomerWhatsApp('${inq.phone}', 'Enquiry')" title="Reply on WhatsApp" style="color:#25D366;">💬</button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  // ===== SETTINGS & PERSISTENCE =====
  loadSettingsForm() {
    const settings = this.getSettings();
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined) el.value = val;
    };

    setVal('setStoreName', settings.storeName || 'Sree Meenakshi Handicrafts');
    setVal('setWhatsappNumber', settings.whatsappNumber || '919944910653');
    setVal('setStoreEmail', settings.storeEmail || 'info@sreemeenakshihandicrafts.com');
    setVal('setRazorpayKey', settings.razorpayKey || '');
    // Sync the Razorpay enable toggle
    const rzpEnabled = settings.razorpayEnabled === true || settings.razorpayEnabled === 'true';
    const checkbox = document.getElementById('setRazorpayEnabled');
    if (checkbox) checkbox.checked = rzpEnabled;
    adminApp._applyRazorpayToggleUI(rzpEnabled);
    setVal('setShippingFee', settings.shippingFee || 150);
    setVal('setFreeShippingThreshold', settings.freeShippingThreshold || 2999);

    setVal('setTopBannerText1', settings.topBannerText1 || '✨ Complimentary FREE Delivery on orders above ₹2,999');
    setVal('setTopBannerHighlight', settings.topBannerHighlight || '🎉 Use Coupon HERITAGE10 for 10% OFF');
    setVal('setCouponCode', settings.couponCode || 'HERITAGE10');
    setVal('setCouponDiscountPct', settings.couponDiscountPct !== undefined ? settings.couponDiscountPct : 10);
    setVal('setWelcomeCouponCode', settings.welcomeCouponCode || 'WELCOME5');
    setVal('setWelcomeDiscountPct', settings.welcomeDiscountPct !== undefined ? settings.welcomeDiscountPct : 5);
  }

  async saveSettingsFromForm(e) {
    e.preventDefault();
    const settings = {
      storeName: document.getElementById('setStoreName')?.value.trim() || 'Sree Meenakshi Handicrafts',
      whatsappNumber: document.getElementById('setWhatsappNumber')?.value.trim() || '919944910653',
      storeEmail: document.getElementById('setStoreEmail')?.value.trim() || 'info@sreemeenakshihandicrafts.com',
      razorpayKey: document.getElementById('setRazorpayKey')?.value.trim() || '',
      razorpayEnabled: document.getElementById('setRazorpayEnabled')?.checked || false,
      shippingFee: parseFloat(document.getElementById('setShippingFee')?.value) || 150,
      freeShippingThreshold: parseFloat(document.getElementById('setFreeShippingThreshold')?.value) || 2999,
      topBannerText1: document.getElementById('setTopBannerText1')?.value.trim() || '',
      topBannerHighlight: document.getElementById('setTopBannerHighlight')?.value.trim() || '',
      couponCode: document.getElementById('setCouponCode')?.value.trim() || 'HERITAGE10',
      couponDiscountPct: parseFloat(document.getElementById('setCouponDiscountPct')?.value) || 10,
      welcomeCouponCode: document.getElementById('setWelcomeCouponCode')?.value.trim() || 'WELCOME5',
      welcomeDiscountPct: parseFloat(document.getElementById('setWelcomeDiscountPct')?.value) || 5,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        this.settings = { ...this.settings, ...settings };
        this.showToast('Store settings saved successfully!', 'success');
        this.broadcastUpdate('SETTINGS_UPDATED');
      }
    } catch (err) {
      console.error('Settings save error:', err);
      this.showToast('Could not save settings to backend.', 'error');
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


  // ===== RAZORPAY TOGGLE =====
  toggleRazorpay() {
    const checkbox = document.getElementById('setRazorpayEnabled');
    if (!checkbox) return;
    checkbox.checked = !checkbox.checked;
    this._applyRazorpayToggleUI(checkbox.checked);
  }

  _applyRazorpayToggleUI(enabled) {
    const slider = document.getElementById('rzpToggleSlider');
    const knob = document.getElementById('rzpToggleKnob');
    if (slider) slider.style.background = enabled ? '#6B5444' : '#ccc';
    if (knob) knob.style.transform = enabled ? 'translateX(22px)' : 'translateX(0)';
  }

// Global Admin Dashboard Instance
const adminApp = new AdminDashboard();

// Search and Filter Listeners
document.addEventListener('DOMContentLoaded', () => {
  const prodSearch = document.getElementById('prodSearchInput');
  const prodCat = document.getElementById('prodCategoryFilter');
  if (prodSearch) {
    prodSearch.addEventListener('input', (e) => {
      adminApp.renderProductsTable(e.target.value, prodCat ? prodCat.value : 'all');
    });
  }
  if (prodCat) {
    prodCat.addEventListener('change', (e) => {
      adminApp.renderProductsTable(prodSearch ? prodSearch.value : '', e.target.value);
    });
  }

  const orderSearch = document.getElementById('orderSearchInput');
  const orderStatus = document.getElementById('orderStatusFilter');
  if (orderSearch) {
    orderSearch.addEventListener('input', (e) => {
      adminApp.renderOrdersTable(orderStatus ? orderStatus.value : 'all', e.target.value);
    });
  }
  if (orderStatus) {
    orderStatus.addEventListener('change', (e) => {
      adminApp.renderOrdersTable(e.target.value, orderSearch ? orderSearch.value : '');
    });
  }
});
