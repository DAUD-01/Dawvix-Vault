import mongoose from 'mongoose';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
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
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        username: user.username,
      },
      secret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
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
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
};

/**
 * Ensures a default admin account exists in MongoDB upon startup.
 */
export const ensureAdminAccount = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.warn('[Auth] Database is not connected yet. Skipping ensureAdminAccount.');
      return;
    }

    const adminUsername = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const existingAdmin = await User.findOne({ username: adminUsername });
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPassword, salt);

      await User.create({
        username: adminUsername,
        passwordHash,
      });

      console.log(`[Auth] Initial admin account created successfully. Username: "${adminUsername}"`);
    } else {
      console.log(`[Auth] Admin account "${adminUsername}" is ready.`);
    }
  } catch (error) {
    console.error('[Auth] Could not ensure admin account:', (error as Error).message);
  }
};
