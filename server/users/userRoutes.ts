import { Router } from 'express';
import { userService } from './userService';
import { optionalAuthenticate } from '../auth/authMiddleware';

export const userRouter = Router();

userRouter.get('/', optionalAuthenticate, (req, res) => {
  const { domain, public: isPublic } = req.query as { domain?: string; public?: string };
  if (!domain) {
    return res.status(400).json({ error: 'domain query parameter is required' });
  }

  if (isPublic !== 'true') {
    return res.status(403).json({ error: 'Only public profiles are accessible through this endpoint' });
  }

  const users = userService.listPublicByDomain(domain);
  res.json({ users });
});
