import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { LoginSession } from '../models/LoginSession.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide both username and password.',
      });
      return;
    }

    const normalizedUsername = username.trim().toLowerCase();
    const user = await User.findOne({ username: normalizedUsername });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
      return;
    }

    const secret = process.env.JWT_SECRET || 'super_secure_vault_jwt_secret_change_me_in_production';
    const sessionId = randomUUID();
    await LoginSession.create({
      _id: sessionId,
      userId: user._id.toString(),
      lastActivity: new Date(),
    });
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
        role: user.role,
        sessionId,
      },
      secret
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An internal server error occurred during login.',
    });
  }
};

export const recordActivity = (_req: AuthRequest, res: Response): void => {
  res.json({ success: true });
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated.' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: req.user.userId,
        username: req.user.username,
        role: req.user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
};

export const ensureAdminAccount = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('[Auth] Database is not connected yet. Skipping ensureAdminAccount.');
      return;
    }

    const adminUsername = (process.env.ADMIN_USERNAME || 'dawood').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'dawood8822';

    if (adminUsername === 'viewer') {
      console.error('[Auth] ADMIN_USERNAME cannot be "viewer"; the viewer role is reserved.');
      return;
    }

    const accountsToEnsure = [
      { username: adminUsername, password: adminPassword, role: 'admin' as const },
      { username: 'admin', password: 'admin123', role: 'admin' as const },
    ];

    for (const acc of accountsToEnsure) {
      const existing = await User.findOne({ username: acc.username });
      if (!existing) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(acc.password, salt);

        await User.create({
          username: acc.username,
          passwordHash,
          role: acc.role,
        });

        console.log(`[Auth] Account created successfully: "${acc.username}"`);
      } else {
        if (existing.role !== acc.role) {
          existing.role = acc.role;
        }
        // Ensure password matches in case env changed
        const isMatch = await existing.comparePassword(acc.password);
        if (!isMatch) {
          const salt = await bcrypt.genSalt(10);
          existing.passwordHash = await bcrypt.hash(acc.password, salt);
          console.log(`[Auth] Updated password for account: "${acc.username}"`);
        }
        await existing.save();
      }
    }

    const viewerPassword = process.env.VIEWER_PASSWORD;
    if (viewerPassword) {
      const viewer = await User.findOne({ username: 'viewer' });
      if (!viewer) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(viewerPassword, salt);
        await User.create({ username: 'viewer', passwordHash, role: 'viewer' });
        console.log('[Auth] Read-only viewer account created.');
      } else {
        const isMatch = await viewer.comparePassword(viewerPassword);
        if (viewer.role !== 'viewer' || !isMatch) {
          const salt = await bcrypt.genSalt(10);
          viewer.passwordHash = await bcrypt.hash(viewerPassword, salt);
          viewer.role = 'viewer';
          await viewer.save();
          console.log('[Auth] Read-only viewer account updated.');
        }
      }
    } else {
      console.warn('[Auth] VIEWER_PASSWORD is not configured; viewer account was not provisioned.');
    }
  } catch (error) {
    console.error('[Auth] Could not ensure accounts:', (error as Error).message);
  }
};
