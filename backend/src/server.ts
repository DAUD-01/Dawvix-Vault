import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { ensureAdminAccount } from './controllers/authController.js';
import authRoutes from './routes/authRoutes.js';
import driveRoutes from './routes/driveRoutes.js';
import { isGoogleDriveConfigured, getGoogleCredentials } from './config/googleDrive.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend requests
app.use(
  cors({
    origin: true, // Allow all local dev origins (e.g. localhost:5173)
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check route
app.get('/api/health', (_req: Request, res: Response) => {
  const creds = getGoogleCredentials();
  res.json({
    status: 'ok',
    service: 'university-vault-backend',
    timestamp: new Date().toISOString(),
    gdriveConfigured: isGoogleDriveConfigured(),
    serviceAccountEmail: creds?.client_email || null,
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/drive', driveRoutes);

import path from 'path';
import fs from 'fs';

// Serve built frontend assets if dist exists
const frontendDistPath = path.resolve(process.cwd(), 'frontend/dist');
const altFrontendDistPath = path.resolve(process.cwd(), '../frontend/dist');
const resolvedDist = fs.existsSync(frontendDistPath)
  ? frontendDistPath
  : fs.existsSync(altFrontendDistPath)
  ? altFrontendDistPath
  : null;

if (resolvedDist) {
  console.log(`[Server] Serving static frontend from: ${resolvedDist}`);
  app.use(express.static(resolvedDist));
}

// Global 404 handler for unknown API routes
app.use('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'API route not found.',
  });
});

// SPA fallback for all non-API GET requests
app.get('*', (_req: Request, res: Response, next: NextFunction) => {
  if (resolvedDist) {
    const indexHtml = path.resolve(resolvedDist, 'index.html');
    if (fs.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
      return;
    }
  }
  next();
});

// Global error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[UnhandledError]', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error occurred.',
    error: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

// Initialize database & start server
const startServer = async () => {
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(` 🛡️  University Vault Gateway Backend    `);
    console.log(` 🚀 Server listening on port: ${PORT}   `);
    console.log(` 🌐 Health: http://localhost:${PORT}/api/health`);
    console.log(`=========================================`);
  });

  // Connect to DB in background
  connectDB()
    .then(() => ensureAdminAccount())
    .catch((err) => {
      console.warn('[Database] Initial connection error:', (err as Error).message);
    });
};

startServer().catch((err) => {
  console.error('[Fatal] Server failed to start:', err);
  process.exit(1);
});

export default app;
