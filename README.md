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
* **Tech Stack**: Node.js, Express, Prisma ORM, PostgreSQL (Neon Serverless Clusters or local PostgreSQL), Nodemailer, JWT.
* **Key Features**: Type-safe query interfaces via Prisma client, isolated tenant workspaces schema constraints, SMTP transactional email queue dispatcher, and auto-wake sleep engines.

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

# Cloudinary API Credentials Configuration (Required for asset deletion)
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
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

### Step 3: Run the Application

You can choose to run the application either using **Docker Compose** (recommended for production-like simulation) or via standard **Local Development Mode**.

#### Option A: Running via Docker Compose (All services containerized)
1. **Verify Docker Desktop is running**: Make sure Docker Desktop is open and the engine is active.
2. **Configure environment files**: Make sure `.env` files are set up inside `server/.env`, `client/.env`, and `admin/.env` directories. No root-level `.env` is required as services pull from their respective subfolders.
3. **Start all services**:
   ```bash
   docker compose up --build
   ```
   *   **What this does**: Automatically compiles static React files, starts `nginx` web servers for client/admin portals, boots the REST backend, generates the Prisma client inside the server container, and hooks up the database connection dynamically.
   *   **Access URLs**:
       *   Client App: `http://localhost:5173`
       *   Super Admin Portal: `http://localhost:5001`
       *   Backend API: `http://localhost:5000`

#### Option B: Standard Local Development (Host machine execution)
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

### 🗄️ Database Workflows & Prisma Command Tools

To view and manage the database structure using Prisma:

1. **Introspect and Validate Schema**:
   Verify Prisma configuration against backend tables:
   ```bash
   cd server && npm run prisma:validate
   ```
2. **Open Visual Database Console (Prisma Studio)**:
   Launch a browser-based admin GUI to inspect, search, and edit database records visually:
   ```bash
   cd server && npm run prisma:studio
   ```
   *(Access it at `http://localhost:5555`)*
3. **Regenerate Prisma Client**:
   Update client generation if the schema changes:
   ```bash
   cd server && npm run prisma:generate
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

