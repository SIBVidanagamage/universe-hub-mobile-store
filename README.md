# Universe Hub - Premium Mobile, Certified iPhones & Repair Lab E-Commerce Platform

A high-performance modern e-commerce storefront, repair management system, and admin center built for **Universe Hub (Maharagama Flagship Store)**.

## 🌟 Key Features

### 🛍️ Storefront & Gadget Catalog
- **Brand New & Certified Pre-Owned iPhones**: Filter by condition, battery health, and Apple warranty.
- **Top Accessory Brands**: Official Anker, Baseus, Ugreen, WiWU, Spigen, Asper & ESR collections.
- **Quick Specs & Media Gallery**: Multi-image carousel and embedded video product demos.
- **Real-time Live Search**: Instant gadget suggestions with category filtering.
- **Shopping Cart & Wishlist**: Slide-in cart drawer with instant quantity stepper and subtotal calculations.

### 💳 Online Payment Gateway Integrations
- **PayHere Sri Lanka**: Central Bank approved IPG simulation with Credit/Debit cards, LankaQR, Internet Banking, and Mobile Wallets (eZ Cash / mCash) with 3D-Secure OTP verification.
- **Stripe International**: Apple Pay, Google Pay, Visa, MasterCard, and American Express with 3DS support.
- **Koko Buy Now Pay Later (BNPL)**: Dynamic 3-month 0% interest installment calculator with exact repayment dates.
- **Cash on Delivery (COD)** & Physical Store Pickup at Maharagama Flagship.

### 🧾 Automated Tax Invoices & PDF Export
- Itemized tax invoice generation with digital security QR code.
- 1-click A4 PDF download using `html2pdf.js`.
- Instant WhatsApp order confirmation button for direct store support.
- Customer order history portal (`My Orders & Invoices`).

### 🔧 Mobile Repair Lab & Status Tracker
- **Interactive Repair Cost Estimator**: Real-time estimates for screen replacement, battery health swaps, back glass laser removal, camera sensors, and water damage.
- **Live Device Tracking**: Customers can check repair progress through real-time step stages (`Received` ➔ `Diagnostic` ➔ `In Repair` ➔ `Quality Check` ➔ `Ready`).

### ⚙️ Full Admin Management Center
- **Inventory CRUD**: Add, edit, or delete products with direct drag-and-drop media uploaders.
- **Bulk CSV/Excel Importer & Exporter**: Bulk import/export products and taxonomy categories.
- **Brand & Category Taxonomies**: Add custom brands/categories with live sync to the navbar and filters.
- **Repair Order Queue**: Status changes with 1-click WhatsApp & SMS customer update notifications.
- **Payment Gateway Settings**: Toggle between Sandbox Demo and Production Live keys, simulate test payments, and review transaction logs.
- **Store Identity Manager**: Update store address, phone numbers, hero showcase banners, and promo cards.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.0 or higher recommended)

### Installation & Run

1. Clone or download the repository:
   ```bash
   git clone <your-repo-url>
   cd "iphone shop website"
   ```

2. Start the local server:
   ```bash
   npm start
   ```
   *(or `node server.js`)*

3. Open your browser:
   ```
   http://localhost:3000
   ```

4. Access the **Admin Center**:
   - Click **"⚙️ Admin Center"** in the top announcement bar or navigate to `http://localhost:3000/#admin`
   - Default credentials:
     - **Email:** `admin@universehub.lk`
     - **Password:** `admin` *(or `admin123`)*

---

## 📁 Project Structure

```
├── assets/                  # High-resolution banners, showcase photos, and brand logo
├── css/
│   ├── style.css           # Core styling, layout, responsive design & dark-mode theme
│   ├── payment.css         # Payment method selector, PayHere & Stripe modals
│   └── invoice.css         # A4 printable tax invoice and order summary styling
├── js/
│   ├── data.js             # Initial product dataset, categories, brands & demo orders
│   ├── app.js              # Storefront application logic, search, cart & checkout
│   ├── payment-gateway.js  # PayHere & Stripe IPG simulation, OTP and transaction logs
│   ├── invoice.js          # Tax invoice generator, QR codes, and PDF export
│   ├── admin.js            # Admin portal controller, repair queue & store settings
│   ├── uploader.js         # Drag & drop photo/video upload engine
│   ├── bulk-uploader.js    # Excel/CSV parser, validator, and bulk uploader
│   └── html2pdf.bundle.min.js # Client-side PDF rendering library
├── uploads/                # Uploaded product and banner media files
├── server.js               # Node.js HTTP server with range streaming & upload API
└── package.json            # Project manifest and scripts
```

---

## 📍 Store Location & Contact

- **Outlet:** Universe Hub Flagship Store
- **Address:** 188/8c, High Level Road, Maharagama, Sri Lanka
- **WhatsApp / Hotline:** 074-0219239
- **Email:** contact@universehub.lk
- **Google Maps:** [View on Google Maps](https://maps.app.goo.gl/r1BY5dMznxRunVC58)
