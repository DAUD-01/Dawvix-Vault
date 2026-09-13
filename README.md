# University Vault - Personal Cloud File Gateway 🛡️

**University Vault** is a full-stack personal cloud file gateway built with React, Vite, Node.js, Express, TypeScript, Mongoose, and Google Drive API.

It serves as an **authenticated streaming proxy** between your client device and a designated Google Drive folder. By terminating Google Drive connections server-side and streaming data directly through the proxy, it **bypasses strict campus or workplace network blocklists** (which often block `drive.google.com` or `*.googleusercontent.com`).

---

## 🏗️ Architecture & Tech Stack

```
+-------------------+           +-----------------------+           +----------------------+
|  React Dashboard  |  <=====>  | Node / Express Proxy  |  <=====>  | Google Drive API v3  |
|  (Vite + Tailwind)|    JWT    |  (TypeScript + Cache) |   OAuth   |   (Target Folder)    |
+-------------------+           +-----------------------+           +----------------------+
                                            |
                                            v
                                 +---------------------+
                                 |   MongoDB Atlas     |
                                 |  (Cached Metadata)  |
                                 +---------------------+
```

- **Frontend (`/frontend`)**:
  - Vite + React 18 + TypeScript
  - Tailwind CSS + Lucide Icons (`lucide-react`)
  - Axios with JWT Interceptor & Blob Stream Downloader
  - Dynamic breadcrumbs navigation with history stack
  - Client-side real-time search and MIME-category filters
  - Table / List view and Grid view toggles
  - Route authentication guard (`<ProtectedRoute />`)

- **Backend (`/backend`)**:
  - Node.js + Express + TypeScript
  - Mongoose + MongoDB (for instant cached metadata indexing)
  - `googleapis` (Drive v3) for recursive file listing, export, and proxy streaming
  - `jsonwebtoken` (JWT) authentication & `bcryptjs` password hashing
  - Auto-seeding initial administrator account
  - Google Docs / Sheets / Slides conversion to PDF export stream
  - Binary file streaming directly piped to client HTTP response

---

## 📁 Repository Structure

```
university-vault/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts           # MongoDB Mongoose connection
│   │   │   └── googleDrive.ts  # GoogleAuth & Drive v3 client setup
│   │   ├── controllers/
│   │   │   ├── authController.ts   # Login, profile check & auto-admin setup
│   │   │   └── driveController.ts  # File listing, recursive sync, proxy download
│   │   ├── middleware/
│   │   │   └── authMiddleware.ts   # Bearer & Query JWT verification
│   │   ├── models/
│   │   │   ├── User.ts         # User authentication model
│   │   │   └── FileMetadata.ts # Cached Drive file metadata schema
│   │   ├── routes/
│   │   │   ├── authRoutes.ts   # /api/auth/*
│   │   │   └── driveRoutes.ts  # /api/drive/*
│   │   ├── utils/
│   │   │   └── seed.ts         # Seeding script with demo university files
│   │   └── server.ts           # Express server entrypoint
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Breadcrumbs.tsx # Clickable folder navigation stack
│   │   │   ├── FileCard.tsx    # Grid view card
│   │   │   ├── FileRow.tsx     # List view table row
│   │   │   ├── LoadingSkeleton.tsx # Sleek skeleton loader
│   │   │   ├── Navbar.tsx      # App header & sync trigger
│   │   │   ├── ProtectedRoute.tsx # Route protection
│   │   │   └── SearchBar.tsx   # Search & filter toolbar
│   │   ├── context/
│   │   │   └── AuthContext.tsx # Global authentication provider
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx   # File explorer dashboard
│   │   │   └── Login.tsx       # Glassmorphism login card
│   │   ├── services/
│   │   │   └── api.ts          # Axios API service & download handlers
│   │   ├── utils/
│   │   │   └── fileUtils.tsx   # Icon mapper & format helpers
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── package.json                # Monorepo root scripts
└── README.md
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **MongoDB**: Local MongoDB instance or MongoDB Atlas URI

### 2. Configure Environment (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/university_vault
JWT_SECRET=super_secure_vault_jwt_secret_change_me_in_production
GOOGLE_DRIVE_ROOT_FOLDER_ID=root
GOOGLE_CREDENTIALS_JSON=
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 3. Setting Up Google Cloud Service Account
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the **Google Drive API**.
3. Create a **Service Account** under *IAM & Admin* -> *Service Accounts*.
4. Create and download a **JSON key** for the Service Account.
5. In Google Drive, open the folder you wish to serve, click **Share**, and paste the Service Account's email (`...iam.gserviceaccount.com`) as a **Viewer**.
6. Copy the **Folder ID** from the Google Drive URL (`https://drive.google.com/drive/folders/<FOLDER_ID>`) into `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
7. Paste the entire raw JSON string of the downloaded key into `GOOGLE_CREDENTIALS_JSON` in `backend/.env`.

### 4. Running the Project

#### Development Mode
From the root directory:
```bash
# Start backend
npm run dev:backend

# In another terminal, start frontend
npm run dev:frontend
```
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend**: [http://localhost:5000](http://localhost:5000)

#### Initial Seed (Optional Preview)
```bash
npm run seed
```
This populates MongoDB with initial demo university folders (Assignments, Lecture Slides) and files (Syllabus.pdf, Starter_Code.zip) for instant testing.

#### Default Admin Credentials:
- **Username**: `admin`
- **Password**: `admin123`

---

## 🔒 Security & Proxy Details

- **Protected API Endpoints**: All `/api/drive/*` routes validate a signed JWT Bearer token in the `Authorization` header.
- **Direct Download Stream Support**: The download endpoint `/api/drive/download/:fileId` supports query token authentication (`?token=<jwt>`), enabling seamless browser file downloads, while fully validating signatures.
- **Google Workspace Export**: Google Docs, Sheets, and Slides are automatically exported to PDF format via `drive.files.export` before streaming.
- **Network Bypassing**: Client devices only ever communicate with your backend server URL. Google Drive domains and IP ranges never touch the client network.
