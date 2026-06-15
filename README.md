# GallaMitra (ગલ્લામિત્ર) — Multi-Tenant SaaS Billing & Vyapar Ledger

GallaMitra is a premium, feature-rich Multi-Tenant SaaS Platform designed for micro, small, and medium businesses (MSMEs) in India. It enables shop owners to manage customer/supplier credit ledgers, construct GST-compliant firm invoices, and analyze their business via premium reporting dashboards and PWA execution.

This is a Monorepo containing the frontend client application, admin console, and backend express server.

---

## 📂 Project Architecture

The monorepo is divided into three primary sub-systems:

### 1. 💼 Owner Client Portal (`/client`)
The main tenant-facing workspace application where business owners perform retail tasks.
* **Tech Stack**: React 19, React Router DOM v7, Vite v8, Tailwind CSS.
* **Key Features**: Customer/Supplier CRUDs, Mixed Ledger (Credit/Debit entries), itemized GST Invoice Builder, 15-Day Free Trial (with automatic warnings & Starter-downgrade), Whatsapp Sharing, Grayscale Single-Page Payment Vouchers, PWA installation & Public Portal shortcuts (with dynamic manifest isolation for multi-app setups), Parent-Child Workspace Subscription Inheritance (auto-sharing plan & duration), support for Starter, Growth, Scale, Enterprise, and Professional tiers, Unified logo/favicon branding, and Multilingual Support (English, Gujarati, Hindi).
* **Hosted At**: `https://gallamitra.vercel.app/`

### 2. 👑 Super Admin Dashboard (`/admin`)
The administrative portal used by platform managers to review registrations and supervise subscription workspaces.
* **Tech Stack**: React, Vite, Framer Motion, Tailwind CSS.
* **Key Features**: Approve/Reject new shops, CRUD and configure custom subscription plans (support for Starter, Growth, Scale, Enterprise, and Professional tiers), reset passwords, monitor database table health metrics, and review system audit logs.

### 3. ⚙️ Server Backend Engine (`/server`)
The centralized core REST API engine powering database logic, security routing, and transactional notifications.
* **Tech Stack**: Node.js, Express, PostgreSQL (Neon Serverless Clusters), Nodemailer, JWT.
* **Key Features**: Parameterized SQL query protections, isolated tenant workspaces schema constraints, SMTP transactional email queue dispatcher, and auto-wake sleep engines.

---

## 📦 Directory Structure

```
gallamitra/
├── admin/                  # Super Admin Dashboard Panel (Vite App)
├── client/                 # Owner Client Portal Application (Vite App)
├── server/                 # Backend REST API Node Server
├── .gitignore              # Monorepo-level Git ignore configuration
└── README.md               # Monorepo-level overview documentation
```

---

## 💻 Local Development Setup

To run GallaMitra on your local machine, follow these steps:

### Prerequisites
* **Node.js** (v18+)
* **npm** or **yarn**
* **PostgreSQL Database** (local or serverless like Neon DB)

---

### Step 1: Install Dependencies
Install packages for all three directories:

```bash
# Install server packages
cd server && npm install

# Install client packages
cd ../client && npm install

# Install admin packages
cd ../admin && npm install
```

---

### Step 2: Environment Configurations
Create `.env` files in each workspace folder.

#### 1. Backend Server (`server/.env`):
```env
PORT=5000
DATABASE_URL=your_postgresql_database_connection_string

# SMTP Email Credentials Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_support_email@gmail.com
SMTP_PASS=your_email_app_password
SMTP_FROM="GallaMitra Support" <your_support_email@gmail.com>

# Platform URLs
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5001

JWT_SECRET=your_jwt_secret_hash_key
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5001
```

#### 2. Owner Client (`client/.env`):
```env
VITE_BACKEND_URL=http://localhost:5000/api
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_cloudinary_upload_preset
```

#### 3. Super Admin (`admin/.env`):
```env
VITE_BACKEND_URL=http://localhost:5000/api
```

---

### Step 3: Run Development Servers
Open three separate terminals and run:

```bash
# Terminal 1: Start Backend API (runs on port 5000)
cd server && npm run dev

# Terminal 2: Start Client Workspace (runs on port 5173)
cd client && npm run dev

# Terminal 3: Start Admin Portal (runs on port 5001)
cd admin && npm run dev
```

---

## 📦 Production Builds & Compilation

Vite utilizes the high-performance **esbuild** minification loop. Compile production files cleanly inside `/dist` folders before deployment:

```bash
# Build Client application
cd client && npm run build

# Build Admin application
cd admin && npm run build
```

---

## 🔒 Security & SEO Production Parameters
* **Header Privacy**: Disabled Express header information via `app.disable('x-powered-by')`.
* **Database Defenses**: Utilizes parameterized database arrays to prevent SQL Injection.
* **Search Engine Visibility**: Custom configured `sitemap.xml` and `robots.txt` direct crawlers to parse root and legal paths (`/privacy`, `/terms`) while isolating auth-restricted panels.
