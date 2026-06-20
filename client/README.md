# GallaMitra Client Dashboard App

GallaMitra (ગલ્લામિત્ર) is a premium, feature-rich SaaS platform designed for micro, small, and medium businesses (MSMEs) to track day-to-day business transactions, manage customer/supplier ledgers, construct professional invoices, and generate deep business analytics.

---

## ⚡ Subscription Plans & Feature Matrix

## ⚡ Subscription Plans & Feature Matrix

GallaMitra features a tiered SaaS plan architecture. Available workspace tabs and features dynamically adapt based on the active shop's plan. Subscription plans can be dynamically configured by Super Admins with custom pricing and flexible billing cycles (supporting Free/Forever, Trial, Monthly, 3-Month, 6-Month, and Yearly configurations), supporting:
* **Starter** (₹0 Free): Core ledger management, Customer/Supplier lists, Products & Services list, Sale/Purchase ledgers, Payment receipts.
* **15-Day Free Trial** (₹0 Free Trial): Grants 15 days of full Professional features, including Reports, Export, and Deep Analytics.
* **Growth** (₹299/mo): Starter features + Invoice builder, Purchase bills, Voucher list, Item registry, Logo upload.
* **Scale** (₹799/3mo): Growth features + Reports & CSV exports, PDF exports, Deep Analytics, Unlimited entries.
* **Enterprise** (₹1749/6mo): Growth features + Reports & CSV exports, PDF exports, Deep Analytics, Unlimited entries, Multi-Business workspace management.
* **Professional** (₹3499/yr): Growth features + Reports & CSV exports, PDF exports, Deep Analytics, Unlimited entries, Multi-Business workspace management.

### 👨‍👧‍👦 Parent-Child Workspace Subscription Inheritance
GallaMitra operates under an account-level subscription framework. Any child businesses or workspaces registered under an existing owner account (email) automatically inherit the plan type, active status, and remaining subscription duration of the parent workspace. Merchants do not need to re-select plans or wait for separate administrative approval when adding additional sub-businesses. All workspaces under the same account remain active until the parent plan's duration expires.

### 🆓 15-Day Free Trial Subscription
Newly registered shop owners can test GallaMitra using the 15-day Free Trial. This trial grants complete access to the features of the **Professional Plan** with no initial restrictions. Desktop/mobile sidebars and headers display a real-time countdown showing remaining trial days. Automated warning notices are sent via email on the 10th and 14th days of the trial. Upon expiration on the 15th day, the shop automatically transitions to the Starter Plan. No business ledger records, invoices, or customer details are lost, allowing owners to upgrade to any paid tier (Growth, Scale, Enterprise, Professional) at any time to resume advanced operations.

### 🥉 Starter Plan (₹0 / Free)
* **Dashboard Overview**: Continuous real-time sales & purchase indicators, quick entry panels.
* **Customer Management (`cust_list`)**: Register customers, track credit/debit balances, view transaction history.
* **Supplier Registry (`supp_list`)**: Track supplier liabilities, payments remitted, and balances.
* **Products & Services (`product_list`)**: Register products/services, standard rates, and optional descriptions for billing auto-fill.
* **Sale Ledger (`sale_ledger`)**: Simple tabular register of credit/cash sales.
* **Purchase Ledger (`purchase_ledger`)**: Tabular register of inventory or goods purchased on credit.
* **Payment Receipt Generator (`payment_receipt`)**: Issue immediate payment vouchers and receipts.
* **Payment Voucher List (`receipt_list`)**: Log of all payments received and records of client cash slips.
* **Profile Settings (`user_settings`)**: Standard business profile management.

### 🥈 Growth Plan (₹299/mo) (Includes Starter features plus:)
* **Invoice Builder (`invoice_builder`)**: Itemized billing generator with automatic GST/discount calculations.
* **Invoice List (`invoice_list`)**: Central repository of issued invoices with download & print capabilities.
* **Sales Item Registry (`sales_list`)**: Dynamic catalog of sold inventory items, pricing logs, and tags.
* **Purchase Item Registry (`purchase_list`)**: Inventory tracking for purchased catalog components.
* **Purchase Bill Creator (`purchase_bill`)**: Create vendor bills with precise tax and balance adjustments.
* **Purchase Bill List (`pbill_list`)**: Manage historical purchase entries and vendor ledger balance logs.
* **Business Settings (`business_settings`)**: Upload business logo, manage workspace settings, toggle sub-options.

### 🥇 Scale & Enterprise & Professional Plans (₹799/3mo, ₹1749/6mo, ₹3499/yr) (Includes Growth features plus:)
* **Reports & CSV Export (`reports`)**: Selectable start and end date-range filters to export Ledgers to CSV, print-friendly PDFs, or print.
* **Analytics & Charts (`analytics`)**: Detailed visualization dashboards displaying monthly trends, customer analysis, and purchase-vs-sales reports.
* **Multi-Business Management** (Enterprise & Professional only): Support for Swapping between multiple active business workspaces instantly.

---

## 🚀 Key Functional Modules

### 1. Multilingual Support
Fully translated across 3 languages, aligning with regional business preferences:
* **English** (en)
* **Gujarati** (ગુજરાતી - gu)
* **Hindi** (हिंदी - hi)
Includes dynamic translation hooks that translate all tabs, ledger items, buttons, and alert states in real-time.

### 2. Multi-Business Workspace Switcher
If enabled for the account, owners can swap between multiple businesses/businesses dynamically via a dropdown header in the TopBar. Users can register new business profiles instantly without logging out.

### 3. Routing & Legal Pages
Supports production-ready client-side routing via **React Router DOM v7**:
* **Home/Landing Page**: Located at `/` (root).
* **Privacy Policy**: Accessible at `/privacy`.
* **Terms of Service**: Accessible at `/terms`.
* **Public Portals**: Shares read-only customer/supplier ledgers via `/public-portal` or `?type=` hashes.

### 4. Search Engine Optimization (SEO)
Indexed for public discoverability on production domains (`https://gallamitra.vercel.app`):
* **Sitemap**: Configured in `public/sitemap.xml` for crawler indexing on root, privacy, and terms paths.
* **Robots Rulebook**: Configured in `public/robots.txt` mapping allowable crawler indexing behaviors and sitemap links.

### 5. Print-Friendly & Grayscale Layouts
Designed specifically to minimize ink usage for low-cost thermal/laser printers:
* Invoices, receipts, and ledger statements render in elegant, high-contrast, black-and-white print sheets.
* Payment vouchers (receipts) use a compact side-by-side flex layout to ensure the entire voucher fits on exactly one page without blank overflows.
* Uses custom CSS print media rules to suppress unnecessary UI margins, headers, and backgrounds.

### 6. Direct WhatsApp Integration
* Instant sharing buttons generate direct portal links to send to customers/suppliers.
* Shortened public URLs allow parties to access their live balance sheets and download PDF statement copies without login barriers.

### 7. Progressive Web App (PWA)
Supports offline caching, full application installation, and public portal shortcut creation:
* **Merchant App**: Owners can install GallaMitra via the "📲 Download App" button in the TopBar or mobile drawer to manage their shops natively.
* **Customer/Supplier Shortcut App**: Customers/suppliers can install their respective portals directly from the browser window using the inline header action or the premium CTA install banner.
* **Dynamic Portal Isolation (Multi-User PWAs)**: When a customer or supplier opens their public portal link, GallaMitra dynamically constructs and injects a parameterized web manifest blob URL. This specifies a unique `id` and `start_url` containing their specific token. As a result, a user can install separate standalone home screen apps for different shop portals (e.g. Maruti Traders, Krishna Sweets) on a single device, and launching any of them will open their respective portal directly.

---

## 🛠️ Tech Stack & Architecture

* **UI Library**: React 19
* **Routing**: React Router DOM v7
* **Build System**: Vite v8 (using fast `esbuild` minifier for production compilation)
* **Styling**: Tailwind CSS v3 & Vanilla CSS
* **Animations**: Framer Motion
* **Icons**: Lucide React
* **State Manager**: Context API (`AppContext.jsx`)

---

## 📦 Directory Structure

```
client/
├── public/                 # Static assets, sitemap.xml, robots.txt, manifest.json, sw.js
├── src/
│   ├── components/
│   │   ├── layout/         # TopBar, Sidebar, RegisterBusinessModal
│   │   └── ui/             # Reusable UI widgets
│   ├── context/            # AppContext.jsx (Global State)
│   ├── pages/              # Primary tab views (CustomerManagement, InvoiceBuilder, Reports, etc.)
│   ├── utils/              # translations.js (Localization maps)
│   ├── App.jsx             # Shell container, routes configuration & router views
│   ├── index.css           # Global stylesheet & Tailwind directives
│   ├── main.jsx            # Entry mount point wrapping the app in BrowserRouter
│   └── sidebarConfig.js    # Sidebar tab configurations & plan registries
├── tailwind.config.js      # Tailwind configurations
├── vite.config.js          # Vite server & bundler configuration
└── package.json            # Client packages & scripts
```

---

## 💻 Getting Started

### Prerequisites
* **Node.js** (v18+)
* **npm** or **yarn**

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the root of the client directory:
   ```env
   VITE_BACKEND_URL=http://localhost:5000/api
   VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
   VITE_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_upload_preset
   ```
3. Run in development mode (starts hot-reloading dev server at `http://localhost:5173`):
   ```bash
   npm run dev
   ```

### Production Build
Compile optimized static production files into the `dist/` directory:
```bash
npm run build
```

To preview the production bundle locally:
```bash
npm run preview
```
