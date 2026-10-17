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
    const configuredUsernames = [
      process.env.ADMIN_USERNAME?.trim().toLowerCase(),
      process.env.VIEWER_USERNAME?.trim().toLowerCase(),
    ];
    if (!configuredUsernames.includes(normalizedUsername)) {
      res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
      return;
    }

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

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET must be configured before users can log in.');
    }
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

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const viewerUsername = process.env.VIEWER_USERNAME;
    const viewerPassword = process.env.VIEWER_PASSWORD;
    if (!adminUsername?.trim() || !adminPassword || !viewerUsername?.trim() || !viewerPassword) {
      throw new Error('ADMIN_USERNAME, ADMIN_PASSWORD, VIEWER_USERNAME, and VIEWER_PASSWORD must be configured.');
    }

    const profiles = [
      {
        username: adminUsername.trim().toLowerCase(),
        password: adminPassword,
        role: 'admin' as const,
      },
      {
        username: viewerUsername.trim().toLowerCase(),
        password: viewerPassword,
        role: 'viewer' as const,
      },
    ];
    if (profiles[0].username === profiles[1].username) {
      throw new Error('ADMIN_USERNAME and VIEWER_USERNAME must be different.');
    }

    for (const profile of profiles) {
      const existing = await User.findOne({ username: profile.username });
      if (!existing) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(profile.password, salt);

        await User.create({
          username: profile.username,
          passwordHash,
          role: profile.role,
        });

        console.log(`[Auth] Account created successfully: "${profile.username}"`);
      } else {
        if (existing.role !== profile.role) {
          existing.role = profile.role;
        }
        const isMatch = await existing.comparePassword(profile.password);
        if (!isMatch) {
          const salt = await bcrypt.genSalt(10);
          existing.passwordHash = await bcrypt.hash(profile.password, salt);
          console.log(`[Auth] Updated password for account: "${profile.username}"`);
        }
        await existing.save();
      }
    }

    await User.deleteMany({ username: { $nin: profiles.map((profile) => profile.username) } });
  } catch (error) {
    console.error('[Auth] Could not ensure accounts:', (error as Error).message);
    throw error;
  }
};
