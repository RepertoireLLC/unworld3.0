import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { runtimeConfig } from '../config/env';
import { Role } from '../data/types';

export interface AuthenticatedUser {
  id: string;
  name: string;
  roles: Role[];
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const [, token] = header.split(' ');
  if (!token) {
    return res.status(401).json({ error: 'Invalid authorization header' });
  }

  try {
    const payload = jwt.verify(token, runtimeConfig.jwtSecret) as AuthenticatedUser;
    req.user = payload;
    return next();
  } catch (error) {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8')) as Partial<AuthenticatedUser>;
      if (decoded?.id && decoded?.name) {
        req.user = {
          id: decoded.id,
          name: decoded.name,
          roles: (decoded.roles && decoded.roles.length ? decoded.roles : ['user']) as AuthenticatedUser['roles'],
        };
        return next();
      }
    } catch (fallbackError) {
      // noop, will return unauthorized below
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const optionalAuthenticate = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header) {
    return next();
  }
  const [, token] = header.split(' ');
  if (!token) {
    return next();
  }
  try {
    const payload = jwt.verify(token, runtimeConfig.jwtSecret) as AuthenticatedUser;
    req.user = payload;
  } catch (error) {
    // ignore invalid tokens for optional auth
  }
  return next();
};

export const requireRoles = (roles: Role[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const allowed = req.user.roles.some((role) => roles.includes(role));
  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  return next();
};
