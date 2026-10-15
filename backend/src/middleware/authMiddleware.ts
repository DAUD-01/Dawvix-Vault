import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { LoginSession, SESSION_IDLE_TIMEOUT_MS } from '../models/LoginSession.js';
import { User, UserRole } from '../models/User.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: UserRole;
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

      void User.findById(userId)
        .select('username role')
        .then((user) => {
          if (!user) {
            res.status(401).json({
              success: false,
              message: 'User account no longer exists. Please log in again.',
            });
            return;
          }

          req.user = {
            userId,
            username: user.username || username,
            role: user.role,
          };
          next();
        })
        .catch((error: unknown) => {
          console.error('[Auth] User authorization lookup failed:', error);
          res.status(500).json({
            success: false,
            message: 'Unable to verify the user account.',
          });
        });
    })
    .catch((error: unknown) => {
      console.error('[Auth] Session activity update failed:', error);
      res.status(500).json({
        success: false,
        message: 'Unable to verify the authorization session.',
      });
    });
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Administrator access is required to modify vault files.',
    });
    return;
  }

  next();
};
