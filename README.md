# Mr. Kukooo Ordering & CMS System

Mr. Kukooo is a modern, high-performance, real-time web application for food ordering and restaurant management. The system is designed with a hybrid storage backend (Firebase Firestore + LocalStorage fallback) to ensure offline availability and instant seeding for development and demo setups.

---

## 🚀 Key Features

* **Customer Storefront**: Interactive geofenced delivery selection (via Leaflet maps), branch selector, item customizer, coupon validation, and WhatsApp order submission with dynamic JPEG receipts (`html2canvas`).
* **Manager CMS Dashboard**: Real-time KPI summaries (revenue, orders count, quantity counters), date/branch filters, data CRUD tables (branches, products, categories, sections, addons, and vouchers), and PDF analytics export.
* **Employee Kitchen Dashboard**: Real-time FIFO (first-in-first-out) Kanban board for cooking statuses, WhatsApp notification integration, and inline order item editing.

---

## 📂 Project Directory Structure

The project has been cleaned and modularized to make modifications simple and logical:

```text
MrKukooo/
├── public/                 # Static assets (images, icons)
├── src/
│   ├── assets/             # Project stylesheet and assets
│   ├── components/
│   │   ├── customer/       # Customer storefront modules
│   │   │   ├── CartDrawer.jsx
│   │   │   ├── MapPicker.jsx
│   │   │   └── ... (ReceiptModal, MenuSection, etc.)
│   │   ├── manager/        # Manager dashboard modules
│   │   │   ├── DashboardAnalytics.jsx
│   │   │   └── ... (OrderManagement, BranchManagement, etc.)
│   │   ├── employee/       # Employee kitchen modules
│   │   │   └── EmployeeDashboard.jsx
│   │   └── StaffLogin.jsx  # Employee / Manager login module
│   ├── App.jsx             # Main Application router & data sync layer
│   ├── firebase.js         # Unified Firestore/LocalStorage operations service
│   ├── index.css           # Styling
│   └── mockData.js         # Initial mock database seeds
├── package.json            # Configuration and dependencies
├── vite.config.js          # Vite config
└── .gitignore              # Ignored files (dist, node_modules, etc.)
```

---

## 🛠️ Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run in development mode**:
   ```bash
   npm run dev
   ```

3. **Build production bundles**:
   ```bash
   npm run build
   ```

4. **Run Linter Checks**:
   ```bash
   npm run lint
   ```

---

## 🌐 How to Upload to GitHub & Deploy to Vercel

The directory is fully set up as a standard single-page app and is ready for Vercel deployment.

### Step 1: Upload to GitHub

1. Open your terminal in the `MrKukooo` folder.
2. Initialize Git if not already done:
   ```bash
   git init
   ```
3. Stage all files (the `.gitignore` is pre-configured to automatically exclude `node_modules` and `dist`):
   ```bash
   git add .
   ```
4. Commit your files:
   ```bash
   git commit -m "Initial commit: Refactored and modularized Mr. Kukooo system"
   ```
5. Create a new repository on your GitHub account, copy the repository link, and run:
   ```bash
   git remote add origin <YOUR_GITHUB_REPO_URL>
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New** -> **Project**.
3. Select your GitHub repository `MrKukooo` and click **Import**.
4. In the **Configure Project** screen:
   * **Framework Preset**: Detects **Vite** automatically.
   * **Root Directory**: `./` (leave default).
   * **Build and Output Settings**: Leave as default.
   * **Environment Variables** (Optional):
     If you want to use live Firebase Firestore database instead of the LocalStorage demo fallback mode, add your Firebase keys (e.g. `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, etc.). Otherwise, leave blank to run in automatic LocalStorage demo mode.
5. Click **Deploy**. Vercel will build and host your project under a free `.vercel.app` subdomain!
