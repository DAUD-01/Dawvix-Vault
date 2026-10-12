import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { LoginSession, SESSION_IDLE_TIMEOUT_MS } from '../models/LoginSession.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
  };
}

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'Access denied. No authorization token provided.',
    });
    return;
  }

  const secret = process.env.JWT_SECRET || 'super_secure_vault_jwt_secret_change_me_in_production';
  let decoded: jwt.JwtPayload;

  try {
    const verified = jwt.verify(token, secret);
    if (typeof verified !== 'object' || !verified) {
      throw new Error('Invalid token payload.');
    }
    decoded = verified;
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authorization token.',
    });
    return;
  }

  if (
    typeof decoded.userId !== 'string' ||
    typeof decoded.username !== 'string' ||
    typeof decoded.sessionId !== 'string'
  ) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authorization token.',
    });
    return;
  }

  const userId = decoded.userId;
  const username = decoded.username;
  const now = new Date();
  const activeSince = new Date(now.getTime() - SESSION_IDLE_TIMEOUT_MS);
  void LoginSession.findOneAndUpdate(
    {
      _id: decoded.sessionId,
      userId,
      lastActivity: { $gt: activeSince },
    },
    { $max: { lastActivity: now } },
    { new: true }
  )
    .then((session) => {
      if (!session) {
        res.status(401).json({
          success: false,
          message: 'Session expired due to inactivity. Please log in again.',
        });
        return;
      }

      req.user = {
        userId,
        username,
      };
      next();
    })
    .catch((error: unknown) => {
      console.error('[Auth] Session activity update failed:', error);
      res.status(500).json({
        success: false,
        message: 'Unable to verify the authorization session.',
      });
    });
};
