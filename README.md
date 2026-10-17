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
  - Axios with JWT Interceptors & Blob Stream Downloader
  - Deep URL state syncing (`?folder=<id>`) for bookmarking and history
  - In-window Multi-Format File Preview Modal (PDF, images with zoom, video & audio with playback speed controls, and code/text with line numbers & syntax wrapping)
  - Extension-aware language names and matching file icons, with a unified Code filter across languages
  - Previous / Next keyboard arrow browsing within folders
  - File explorer keyboard navigation: arrow keys to move, Enter to open, and Backspace / Alt+Left to go back
  - Multi-file batch selection with bulk download and direct link export
  - Drag files from the desktop into folders, or move selected vault files between folders
  - Persistent upload progress with percentage completion
  - Global Vault Search vs. Folder-Local Search modes
  - Custom filter and sort menus; sort by Name, Size, Date, and Type (ascending / descending)
  - Interactive toast notification system
  - Table / List view and Grid view toggles
  - Route authentication guard (`<ProtectedRoute />`)

- **Backend (`/backend`)**:
  - Node.js + Express + TypeScript
  - Mongoose + MongoDB (for instant cached metadata indexing & live vault stats)
  - `googleapis` (Drive v3) for recursive file indexing, export, and proxy streaming
  - HTTP Range Requests (RFC 7233 / HTTP 206 Partial Content) for instant video/audio seeking and resumable downloads
  - Dynamic Google Drive client resolution
  - `jsonwebtoken` (JWT) authentication & `bcryptjs` password hashing
  - Google Docs / Sheets / Slides conversion to PDF export stream
  - Extension-correct downloads for extensionless Office files; native Google Docs download as editable DOCX
  - RFC 6266 & 5987 compliant Content-Disposition handling for multi-language filenames

---

## 📁 Repository Structure

```
university-vault/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts           # MongoDB Mongoose connection
│   │   │   └── googleDrive.ts  # Dynamic GoogleAuth & Drive v3 client setup
│   │   ├── controllers/
│   │   │   ├── authController.ts   # Login, profile check & auto-admin setup
│   │   │   └── driveController.ts  # File listing, stats, range streaming, proxy download
│   │   ├── middleware/
│   │   │   └── authMiddleware.ts   # Bearer & Query JWT verification
│   │   ├── models/
│   │   │   ├── User.ts         # User authentication model
│   │   │   ├── LoginSession.ts # Sliding 12-hour idle sessions
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
│   │   │   ├── Breadcrumbs.tsx       # Clickable folder navigation stack
│   │   │   ├── FileCard.tsx          # Grid view card with multi-select & actions
│   │   │   ├── FilePreviewModal.tsx  # In-window viewer with zoom, speed & code lines
│   │   │   ├── FileRow.tsx           # List view table row with checkboxes
│   │   │   ├── LoadingSkeleton.tsx   # Sleek skeleton loader
│   │   │   ├── Navbar.tsx            # App header with live vault storage stats
│   │   │   ├── ProtectedRoute.tsx    # Route protection guard
│   │   │   └── SearchBar.tsx         # Search scope, category filter & sort toolbar
│   │   ├── context/
│   │   │   └── AuthContext.tsx       # Global authentication provider
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx         # File explorer dashboard with batch operations
│   │   │   └── Login.tsx             # Glassmorphism login card
│   │   ├── services/
│   │   │   └── api.ts                # Axios API service, stats & download handlers
│   │   ├── utils/
│   │   │   └── fileUtils.tsx         # Icon mapper & format helpers
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── package.json                      # Monorepo root scripts
└── README.md
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v22/v24)
- **MongoDB**: Local MongoDB instance or MongoDB Atlas URI

### 2. Configure Environment (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/university_vault
JWT_SECRET=replace-with-a-long-random-secret
GOOGLE_DRIVE_ROOT_FOLDER_ID=root
GOOGLE_CREDENTIALS_JSON=
ADMIN_USERNAME=your-admin-profile
ADMIN_PASSWORD=your-admin-password
VIEWER_USERNAME=your-viewer-profile
VIEWER_PASSWORD=your-viewer-password
```

The backend provisions only these two profiles and synchronizes their passwords from the environment variables. Existing database accounts outside these configured profiles are removed. The viewer account can browse, preview, and download files but cannot sync, upload, create, rename, move, copy, or delete files. Those operations are restricted to the configured admin profile.

### 3. Setting Up Google Cloud Service Account
1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the **Google Drive API**.
3. Create a **Service Account** under *IAM & Admin* -> *Service Accounts*.
4. Create and download a **JSON key** for the Service Account.
5. In Google Drive, open the folder you wish to serve, click **Share**, and paste the Service Account's email (`...iam.gserviceaccount.com`) as a **Viewer**.
6. Copy the **Folder ID** from the Google Drive URL (`https://drive.google.com/drive/folders/<FOLDER_ID>`) into `GOOGLE_DRIVE_ROOT_FOLDER_ID`.
7. Paste the entire raw JSON string of the downloaded key into `GOOGLE_CREDENTIALS_JSON` in `backend/.env` or place `credentials.json` in `backend/`.

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

#### Profiles
- Admin and viewer usernames/passwords are set by `ADMIN_USERNAME`/`ADMIN_PASSWORD` and `VIEWER_USERNAME`/`VIEWER_PASSWORD` in `backend/.env`.
- No default login credentials are provided; configure both profiles before starting the backend.

---

## 🔒 Security & Streaming Details

- **HTTP 206 Partial Content**: Full support for HTTP `Range` headers, enabling video/audio scrubbing and seeking in preview players, along with resumable multi-thread downloads.
- **Protected API Endpoints**: All `/api/drive/*` routes validate a signed JWT Bearer token in the `Authorization` header.
- **Idle Session Expiry**: Login sessions expire after 12 hours without user activity and extend while the user remains active.
- **Direct Download Stream Support**: The download endpoint `/api/drive/download/:fileId` supports query token authentication (`?token=<jwt>`), enabling direct browser downloads with full signature verification.
- **Google Workspace Export**: Google Docs, Sheets, and Slides are automatically converted to PDF format via `drive.files.export` before streaming.
- **Network Bypassing**: Client devices only ever communicate with your backend server URL. Google Drive domains and IP ranges never touch the client network.
