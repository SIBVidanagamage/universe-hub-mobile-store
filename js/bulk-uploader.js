/**
 * Universe Hub - Bulk Upload & Export Engine (Products & Categories)
 * Supports Excel CSV, TSV (copy-paste), and JSON with validation, live preview, and sample templates.
 */

const BulkUploader = {
  currentType: 'products', // 'products' or 'categories'
  parsedData: [],
  validItems: [],
  invalidCount: 0,

  init() {
    this.setupDropzones();
  },

  setupDropzones() {
    ['prod', 'cat'].forEach(type => {
      const dropzone = document.getElementById(`bulk-${type}-dropzone`);
      const input = document.getElementById(`bulk-${type}-file-input`);
      if (!dropzone || !input) return;

      dropzone.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
          input.click();
        }
      });

      input.addEventListener('change', (e) => {
        if (input.files && input.files.length > 0) {
          this.handleFileSelected(input.files[0], type === 'prod' ? 'products' : 'categories');
          input.value = '';
        }
      });

      ['dragenter', 'dragover'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.style.borderColor = 'var(--neon-cyan)';
          dropzone.style.background = 'rgba(0,210,255,0.06)';
        });
      });

      ['dragleave', 'dragend', 'drop'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.style.borderColor = 'rgba(255,255,255,0.2)';
          dropzone.style.background = 'rgba(255,255,255,0.02)';
        });
      });

      dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files.length > 0) {
          this.handleFileSelected(e.dataTransfer.files[0], type === 'prod' ? 'products' : 'categories');
        }
      });
    });
  },

  openModal(type = 'products') {
    this.currentType = type;
    this.parsedData = [];
    this.validItems = [];
    this.invalidCount = 0;

    // Reset preview containers
    const prodPrev = document.getElementById('bulk-prod-preview-wrap');
    if (prodPrev) prodPrev.style.display = 'none';
    const catPrev = document.getElementById('bulk-cat-preview-wrap');
    if (catPrev) catPrev.style.display = 'none';

    // Clear textareas
    const pText = document.getElementById('bulk-prod-paste-textarea');
    if (pText) pText.value = '';
    const cText = document.getElementById('bulk-cat-paste-textarea');
    if (cText) cText.value = '';

    this.switchTab(type);

    const m = document.getElementById('admin-bulk-upload-modal');
    if (m) {
      m.classList.add('active');
      m.style.display = 'flex';
      m.style.opacity = '1';
      m.style.visibility = 'visible';
      m.style.pointerEvents = 'auto';
      document.body.style.overflow = 'hidden';
    }
    if (typeof App !== 'undefined' && typeof App.openModal === 'function') {
      App.openModal('admin-bulk-upload-modal');
    }
  },

  closeModal() {
    const m = document.getElementById('admin-bulk-upload-modal');
    if (m) {
      m.classList.remove('active');
      m.style.display = 'none';
      m.style.opacity = '0';
      m.style.visibility = 'hidden';
      m.style.pointerEvents = 'none';
      document.body.style.overflow = 'auto';
    }
    if (typeof App !== 'undefined' && typeof App.closeModal === 'function') {
      App.closeModal('admin-bulk-upload-modal');
    }
  },

  switchTab(tab) {
    this.currentType = tab;
    document.querySelectorAll('.bulk-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    const prodContent = document.getElementById('bulk-tab-content-products');
    const catContent = document.getElementById('bulk-tab-content-categories');
    if (prodContent) prodContent.style.display = tab === 'products' ? 'block' : 'none';
    if (catContent) catContent.style.display = tab === 'categories' ? 'block' : 'none';
  },

  // Robust CSV / TSV parser handling quotes, newlines, and delimiter detection
  parseCSV(text) {
    if (!text || !text.trim()) return [];

    // Check if it's JSON
    const trimmed = text.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return JSON.parse(trimmed);
      } catch (e) {
        console.warn('Attempted JSON parse failed, falling back to CSV', e);
      }
    }

    const lines = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;

    // Detect delimiter: tab or comma
    const firstLine = text.split('\n')[0] || '';
    const delimiter = (firstLine.includes('\t') && !firstLine.includes(',')) ? '\t' : ',';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !insideQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip \n in \r\n
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c !== '')) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c !== '')) {
        lines.push(currentRow);
      }
    }

    if (lines.length < 2) return [];

    // Parse headers (normalize to lowercase without spaces/quotes)
    const headers = lines[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      const obj = {};
      headers.forEach((h, colIdx) => {
        obj[h] = row[colIdx] !== undefined ? row[colIdx] : '';
      });
      rows.push(obj);
    }

    return rows;
  },

  handleFileSelected(file, type) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      if (type === 'products') {
        const textarea = document.getElementById('bulk-prod-paste-textarea');
        if (textarea) textarea.value = content;
        this.processProductsInput(content);
      } else {
        const textarea = document.getElementById('bulk-cat-paste-textarea');
        if (textarea) textarea.value = content;
        this.processCategoriesInput(content);
      }
    };
    reader.readAsText(file);
  },

  // --------------------------------------------------------------------------
  // PRODUCTS BULK PROCESSOR
  // --------------------------------------------------------------------------
  processProductsInput(rawText) {
    const text = rawText || document.getElementById('bulk-prod-paste-textarea')?.value || '';
    if (!text.trim()) {
      showToast('Please select a CSV file or paste product data.');
      return;
    }

    const rows = this.parseCSV(text);
    if (!rows || rows.length === 0) {
      showToast('❌ Could not parse products. Please ensure the CSV has a header row.');
      return;
    }

    this.validItems = [];
    this.invalidCount = 0;

    rows.forEach((row, idx) => {
      // Find matching keys flexible with header naming
      const name = row.name || row.title || row.productname || row.producttitle || row.item || '';
      const brand = row.brand || row.maker || row.brandname || 'Apple';
      const category = row.category || row.cat || row.categoryid || 'brand-new-iphones';
      const condition = row.condition || (name.toLowerCase().includes('used') ? 'Used - Grade A+' : '');
      
      // Clean numeric prices
      const rawPrice = String(row.price || row.sellingprice || '0').replace(/[^0-9.]/g, '');
      const price = parseFloat(rawPrice) || 0;
      
      const rawOrig = String(row.originalprice || row.mrp || '0').replace(/[^0-9.]/g, '');
      const originalPrice = parseFloat(rawOrig) || (price > 0 ? Math.round(price * 1.08) : 0);

      const rawStock = String(row.stock || row.qty || row.quantity || '5').replace(/[^0-9]/g, '');
      const stock = parseInt(rawStock, 10) || 10;
      const stockStatus = row.stockstatus || row.status || (row.onrequest === 'true' ? 'on-request' : 'available');

      const rawBattery = String(row.batteryhealth || row.battery || '').replace(/[^0-9]/g, '');
      const batteryHealth = rawBattery ? parseInt(rawBattery, 10) : (condition && condition.includes('New') ? 100 : null);

      const warranty = row.warranty || (condition && condition.includes('New') ? '1 Year Official Apple Care + Store Care' : '6-Month Store Warranty');
      const image = row.image || row.imageurl || row.photo || 'assets/hero_showcase.jpg';
      const description = row.description || row.desc || `${name} - 100% Genuine Tech available at Universe Hub.`;

      if (!name || price <= 0) {
        this.invalidCount++;
        return;
      }

      const id = row.id || ('prod-' + Math.random().toString(36).substring(2, 8));

      this.validItems.push({
        id,
        name,
        brand,
        category,
        condition,
        conditionBadge: condition ? (condition.includes('New') ? 'Brand New' : 'Certified Used') : null,
        batteryHealth,
        price,
        originalPrice,
        discount: originalPrice > price ? `${Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF` : null,
        stock,
        stockStatus,
        warranty,
        image,
        images: [image],
        description,
        rating: 5.0,
        reviewsCount: Math.floor(8 + Math.random() * 20),
        isFeatured: row.isfeatured === 'true' || row.featured === 'true' || false,
        tags: [brand, condition].filter(Boolean)
      });
    });

    this.renderProductsPreview();
  },

  renderProductsPreview() {
    const wrap = document.getElementById('bulk-prod-preview-wrap');
    const badge = document.getElementById('bulk-prod-preview-badge');
    const tbody = document.getElementById('bulk-prod-preview-tbody');
    const btnImport = document.getElementById('btn-execute-import-prod');

    if (!wrap || !tbody) return;

    wrap.style.display = 'block';

    if (badge) {
      badge.innerHTML = `
        <span style="color:var(--success); font-weight:700;">✓ ${this.validItems.length} Valid Products Ready</span>
        ${this.invalidCount > 0 ? `<span style="color:#ef4444; margin-left:8px;">(⚠️ ${this.invalidCount} Invalid/Skipped rows)</span>` : ''}
      `;
    }

    if (btnImport) {
      btnImport.disabled = this.validItems.length === 0;
      btnImport.textContent = `🚀 Import ${this.validItems.length} Products to Store`;
    }

    if (this.validItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:16px; color:#ef4444;">No valid products detected. Please check CSV format.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.validItems.slice(0, 15).map((p, idx) => `
      <tr>
        <td style="color:#64748b; text-align:center;">${idx + 1}</td>
        <td>
          <div style="font-weight:700; color:#fff;">${p.name}</div>
          <small style="color:var(--text-muted);">${p.brand} • ${p.category}</small>
        </td>
        <td><span class="badge-pill" style="font-size:11px;">${p.condition || '— None —'}</span></td>
        <td style="font-weight:700; color:var(--neon-cyan);">Rs. ${p.price.toLocaleString()}</td>
        <td style="text-align:center;">${p.stock}</td>
        <td style="color:#10b981; font-weight:700; text-align:center;">Ready</td>
      </tr>
    `).join('') + (this.validItems.length > 15 ? `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); font-size:12px;">...and ${this.validItems.length - 15} more items</td></tr>` : '');
  },

  // --------------------------------------------------------------------------
  // CATEGORIES BULK PROCESSOR
  // --------------------------------------------------------------------------
  processCategoriesInput(rawText) {
    const text = rawText || document.getElementById('bulk-cat-paste-textarea')?.value || '';
    if (!text.trim()) {
      showToast('Please select a CSV file or paste category data.');
      return;
    }

    const rows = this.parseCSV(text);
    if (!rows || rows.length === 0) {
      showToast('❌ Could not parse categories. Please ensure the CSV has a header row.');
      return;
    }

    this.validItems = [];
    this.invalidCount = 0;

    rows.forEach(row => {
      const name = row.name || row.categoryname || row.title || '';
      const group = (row.group || row.parentgroup || 'accessories').toLowerCase();
      const icon = row.icon || row.emoji || (group === 'iphones' ? '📱' : '⚡');
      const inNav = row.innav !== 'false' && row.innav !== false;
      const inFilter = row.infilter !== 'false' && row.infilter !== false;

      if (!name) {
        this.invalidCount++;
        return;
      }

      // Generate clean ID from name if not provided
      const id = row.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      this.validItems.push({
        id,
        name,
        group,
        groupName: group === 'iphones' ? 'iPhones' : (group === 'accessories' ? 'Accessories' : 'Smart Gadgets'),
        icon,
        inNav,
        inFilter,
        order: parseInt(row.order || '99', 10) || 99
      });
    });

    this.renderCategoriesPreview();
  },

  renderCategoriesPreview() {
    const wrap = document.getElementById('bulk-cat-preview-wrap');
    const badge = document.getElementById('bulk-cat-preview-badge');
    const tbody = document.getElementById('bulk-cat-preview-tbody');
    const btnImport = document.getElementById('btn-execute-import-cat');

    if (!wrap || !tbody) return;

    wrap.style.display = 'block';

    if (badge) {
      badge.innerHTML = `
        <span style="color:var(--success); font-weight:700;">✓ ${this.validItems.length} Valid Categories Ready</span>
        ${this.invalidCount > 0 ? `<span style="color:#ef4444; margin-left:8px;">(⚠️ ${this.invalidCount} Skipped rows)</span>` : ''}
      `;
    }

    if (btnImport) {
      btnImport.disabled = this.validItems.length === 0;
      btnImport.textContent = `🚀 Import ${this.validItems.length} Categories to Navbar`;
    }

    if (this.validItems.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:16px; color:#ef4444;">No valid categories detected.</td></tr>`;
      return;
    }

    tbody.innerHTML = this.validItems.map((c, idx) => `
      <tr>
        <td style="color:#64748b; text-align:center;">${idx + 1}</td>
        <td>
          <span style="font-size:16px; margin-right:6px;">${c.icon}</span>
          <strong style="color:#fff;">${c.name}</strong>
          <small style="color:var(--text-muted); display:block; font-family:monospace;">ID: ${c.id}</small>
        </td>
        <td><span class="badge-pill" style="font-size:11px;">${c.groupName}</span></td>
        <td style="text-align:center;">${c.inNav ? '✅ Yes' : '❌ No'}</td>
        <td style="color:#10b981; font-weight:700; text-align:center;">Ready</td>
      </tr>
    `).join('');
  },

  // --------------------------------------------------------------------------
  // EXECUTE IMPORT (COMMIT TO LOCALSTORAGE)
  // --------------------------------------------------------------------------
  executeImport(type) {
    if (!this.validItems || this.validItems.length === 0) {
      showToast('No valid items to import.');
      return;
    }

    const modeRadio = document.querySelector(`input[name="bulk-${type === 'products' ? 'prod' : 'cat'}-mode"]:checked`);
    const mode = modeRadio ? modeRadio.value : 'append';

    if (type === 'products') {
      let existing = JSON.parse(localStorage.getItem('UH_PRODUCTS')) || (typeof INITIAL_PRODUCTS !== 'undefined' ? INITIAL_PRODUCTS : []);
      
      let finalProducts = [];
      if (mode === 'replace') {
        if (!confirm(`Are you sure you want to REPLACE the entire product catalog with these ${this.validItems.length} products?`)) {
          return;
        }
        finalProducts = [...this.validItems];
      } else {
        // Append mode: update if ID exists, or append
        finalProducts = [...existing];
        this.validItems.forEach(newItem => {
          const existingIdx = finalProducts.findIndex(p => p.id === newItem.id);
          if (existingIdx !== -1) {
            finalProducts[existingIdx] = { ...finalProducts[existingIdx], ...newItem };
          } else {
            finalProducts.push(newItem);
          }
        });
      }

      localStorage.setItem('UH_PRODUCTS', JSON.stringify(finalProducts));
      
      // Update Admin & Storefront views
      if (typeof AdminController !== 'undefined') {
        AdminController.renderStats();
        AdminController.renderProductsTable();
      }
      if (typeof App !== 'undefined') {
        App.renderCatalog();
        App.renderCategories();
      }

      App.closeModal('admin-bulk-upload-modal');
      showToast(`🎉 Successfully imported ${this.validItems.length} products to inventory!`);
    } else {
      let existing = JSON.parse(localStorage.getItem('UH_CATEGORIES')) || (typeof INITIAL_CATEGORIES !== 'undefined' ? INITIAL_CATEGORIES : []);
      
      let finalCategories = [];
      if (mode === 'replace') {
        if (!confirm(`Are you sure you want to REPLACE all categories with these ${this.validItems.length} categories?`)) {
          return;
        }
        finalCategories = [...this.validItems];
      } else {
        finalCategories = [...existing];
        this.validItems.forEach(newCat => {
          const idx = finalCategories.findIndex(c => c.id === newCat.id);
          if (idx !== -1) {
            finalCategories[idx] = { ...finalCategories[idx], ...newCat };
          } else {
            finalCategories.push(newCat);
          }
        });
      }

      localStorage.setItem('UH_CATEGORIES', JSON.stringify(finalCategories));

      if (typeof AdminController !== 'undefined') {
        AdminController.populateCategoryDropdowns();
        AdminController.renderCategoriesManager();
      }
      if (typeof App !== 'undefined') {
        App.renderNavbar();
        App.renderCatalogTabs();
        App.renderCategories();
        App.renderCatalog();
      }

      App.closeModal('admin-bulk-upload-modal');
      showToast(`🎉 Successfully imported ${this.validItems.length} categories to Navbar!`);
    }
  },

  // --------------------------------------------------------------------------
  // TEMPLATES & EXPORT TO CSV
  // --------------------------------------------------------------------------
  downloadFile(filename, content, mimeType = 'text/csv;charset=utf-8;') {
    // Prefix with UTF-8 BOM so Excel on Windows properly displays accents & emojis
    const blob = new Blob(['\uFEFF' + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  downloadProductTemplate() {
    const csvContent = 
`name,brand,category,condition,price,originalPrice,stock,batteryHealth,warranty,image,description
"Apple iPhone 15 Pro 128GB - Natural Titanium","Apple","brand-new-iphones","Brand New",335000,360000,8,100,"1 Year Official Apple Care","assets/hero_showcase.jpg","Brand new factory sealed iPhone 15 Pro in Natural Titanium with TRCSL certification."
"Apple iPhone 14 Pro Max 256GB - Deep Purple","Apple","used-iphones","Used - Grade A+",245000,265000,4,96,"6-Month Store Warranty","assets/iphone_showcase_banner.jpg","Certified pre-owned iPhone 14 Pro Max with 96% original battery health and 100% genuine parts."
"Anker 65W GaN Dual USB-C Fast Charger","Anker","chargers","Brand New",11990,13500,25,100,"18-Month Manufacturer Warranty","assets/chargers_banner.jpg","Ultra-compact 65W GaN high-speed charging brick for fast charging iPhones, MacBooks, and iPads."
"Spigen Ultra Hybrid MagSafe Crystal Case","Spigen","back-covers","Brand New",6490,7500,30,100,"6-Month Warranty","assets/cases_banner.jpg","Crystal clear anti-yellowing case with built-in strong MagSafe neodymium magnets."`;

    this.downloadFile('UniverseHub_Products_Template.csv', csvContent);
    showToast('📥 Sample Product CSV template downloaded!');
  },

  downloadCategoryTemplate() {
    const csvContent = 
`id,name,group,icon,inNav,inFilter,order
"brand-new-iphones","Brand New iPhones","iphones","🍏",true,true,1
"used-iphones","Certified Used iPhones","iphones","🔄",true,true,2
"back-covers","Back Covers & Cases","accessories","🛡️",true,true,3
"chargers","Fast Chargers & GaN","accessories","⚡",true,true,4
"audio","Audio & AirPods","accessories","🎧",true,true,5
"smart-watches","Smart Watches & Bands","accessories","⌚",true,true,6
"powerbanks","Fast Charge Powerbanks","accessories","🔋",true,true,7`;

    this.downloadFile('UniverseHub_Categories_Template.csv', csvContent);
    showToast('📥 Sample Category CSV template downloaded!');
  },

  exportProductsCSV() {
    const products = JSON.parse(localStorage.getItem('UH_PRODUCTS')) || (typeof INITIAL_PRODUCTS !== 'undefined' ? INITIAL_PRODUCTS : []);
    if (products.length === 0) {
      showToast('No products found to export.');
      return;
    }

    const headers = ['id', 'name', 'brand', 'category', 'condition', 'price', 'originalPrice', 'stock', 'batteryHealth', 'warranty', 'image', 'description'];
    const rows = products.map(p => [
      `"${p.id || ''}"`,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.brand || '').replace(/"/g, '""')}"`,
      `"${(p.category || '').replace(/"/g, '""')}"`,
      `"${(p.condition || '').replace(/"/g, '""')}"`,
      p.price || 0,
      p.originalPrice || 0,
      p.stock || 0,
      p.batteryHealth || '',
      `"${(p.warranty || '').replace(/"/g, '""')}"`,
      `"${(p.image || '').replace(/"/g, '""')}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    this.downloadFile(`UniverseHub_Products_Export_${new Date().toISOString().slice(0,10)}.csv`, csv);
    showToast(`📤 Exported ${products.length} products to CSV!`);
  },

  exportCategoriesCSV() {
    const categories = JSON.parse(localStorage.getItem('UH_CATEGORIES')) || (typeof INITIAL_CATEGORIES !== 'undefined' ? INITIAL_CATEGORIES : []);
    if (categories.length === 0) {
      showToast('No categories found to export.');
      return;
    }

    const headers = ['id', 'name', 'group', 'icon', 'inNav', 'inFilter', 'order'];
    const rows = categories.map(c => [
      `"${c.id || ''}"`,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${c.group || 'accessories'}"`,
      `"${c.icon || '📦'}"`,
      c.inNav !== false,
      c.inFilter !== false,
      c.order || 99
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    this.downloadFile(`UniverseHub_Categories_Export_${new Date().toISOString().slice(0,10)}.csv`, csv);
    showToast(`📤 Exported ${categories.length} categories to CSV!`);
  }
};

// Explicitly bind to window for cross-script and inline event handlers
if (typeof window !== 'undefined') {
  window.BulkUploader = BulkUploader;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BulkUploader;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => BulkUploader.init());
  } else {
    BulkUploader.init();
  }
}

