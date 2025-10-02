import type { NextFunction, Response } from 'express';
import { DataStore } from '../data/store';
import type { AuthenticatedRequest } from '../types';

export function createAuthMiddleware(store: DataStore) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing authorization token' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const userId = store.getUserIdForToken(token);

    if (!userId) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const user = store.getUserById(userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const { password: _password, ...publicUser } = user;
    void _password;
    req.user = publicUser;
    req.token = token;
    next();
  };
}
