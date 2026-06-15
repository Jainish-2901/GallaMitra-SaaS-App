# GallaMitra Super Admin Panel

The **GallaMitra Super Admin Dashboard** is a high-performance control console used by platform operators to verify new merchant registrations, supervise tenant subscription workspaces, configure billing plans, inspect database row metrics, and monitor platform health.

---

## ⚡ Key Features & Pages

### 1. Dashboard Overview (`DashboardPage.jsx`)
* Displays platform-wide business statistics, including total workspaces, pending approvals, active shops, and total database activity logs.
* Visualizes tenant registration velocities and subscription distributions.

### 2. Shop Verification Registry (`ShopsPage.jsx`)
* **Tenant Lifecycle Control**: Administrative approval pipeline to Approve or Reject newly registered businesses.
* **Subscription Management**: Instantly assign custom subscription plans (Starter, Growth, Scale, Enterprise, Professional) and adjust subscription expiration dates.
* **Audit Control**: Purge or suspend misbehaving workspaces with a unified workspace deletion flow.

### 3. Plans & Module Permissions (`AdminSettingsPage.jsx`)
* **Dynamic CRUD**: Add, edit, or delete billing plans in real-time.
* **Flexible Durations**: Configure cycle frequencies, supporting **Free/Forever, Monthly, 3 Months, 6 Months, and Yearly** billing cycles.
* **Granular Tab Toggles**: Allocate page-level menu permissions (allowed tabs) dynamically per subscription tier (e.g., locking CSV reports to the Professional plan).
* **Workspaces Rules**: Toggle auto-approval behaviors and multi-business capabilities on a plan level.

### 4. Database Engine Monitor (`DbHealthPage.jsx`)
* Direct metrics pipeline displaying row counters for `Shop`, `Customer`, `Supplier`, `LedgerEntry`, and `Invoice` schemas.
* Performs fast PostgreSQL index efficiency checks and database connection handshake tests.

### 5. Audit Trails & Logs (`ActivityPage.jsx` & `AuditTrailPage.jsx`)
* Review actor actions, affected shops, timestamp traces, and database modification categories.

---

## 🛠️ Tech Stack & Dependencies

* **UI Library**: React (Vite-driven build system)
* **Animations**: Framer Motion (smooth transition loops)
* **Icons**: Lucide React
* **Styling**: Tailwind CSS & custom variables index stylesheet
* **State Manager**: Custom React Admin Context (`AdminContext.jsx`)

---

## 📦 Directory Structure

```
admin/
├── public/                 # Favicon.ico, logo.png, manifest.json, sw.js
├── src/
│   ├── components/         # AdminLayout, AdminSidebar, AdminLogin
│   ├── context/            # AdminContext.jsx (admin authentication and API links)
│   ├── pages/              # DashboardPage, ShopsPage, AdminSettingsPage, DbHealthPage, ActivityPage
│   ├── App.jsx             # React Router routing shell
│   ├── index.css           # Custom CSS styling variables and global utility styles
│   └── main.jsx            # Entry mount point
├── vite.config.js          # Vite configuration
└── package.json            # NPM scripts and dependencies
```

---

## 💻 Local Development Setup

### Prerequisites
* **Node.js** (v18+)
* **npm** or **yarn**

### Installation & Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the root of the `/admin` folder:
   ```env
   VITE_BACKEND_URL=http://localhost:5000/api
   ```
3. Run the development server (runs on `http://localhost:5001` by default):
   ```bash
   npm run dev
   ```

### Production Build
Compile optimized static production files into the `/dist` directory:
```bash
npm run build
```
