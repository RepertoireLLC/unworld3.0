import { Router } from 'express';
import { layerService } from './layerService';
import { authenticate, optionalAuthenticate, requireRoles, AuthenticatedRequest } from '../auth/authMiddleware';
import { layerManager } from './layerManager';
import { userService } from '../users/userService';
import { metricsService } from '../metrics/metricsService';
import { auditLogger } from '../logs/auditLogger';

export const layerRouter = Router();

layerRouter.get('/', optionalAuthenticate, (req: AuthenticatedRequest, res) => {
  const layers = layerService.getVisibleLayers(req.user?.roles);
  res.json({ layers });
});

layerRouter.get('/metrics/summary', authenticate, requireRoles(['admin', 'moderator']), (_req, res) => {
  res.json({ metrics: metricsService.latest() });
});

layerRouter.get('/audit', authenticate, requireRoles(['admin', 'moderator']), (_req, res) => {
  res.json({ logs: auditLogger.list(50) });
});

layerRouter.get('/by-id/:id/users', optionalAuthenticate, (req, res) => {
  const { id } = req.params;
  const layer = layerManager.list().find((item) => item.id === id);
  if (!layer) {
    return res.status(404).json({ error: 'Layer not found' });
  }
  const users = layerService.getPublicUsers(layer.name);
  res.json({ layer, users });
});

layerRouter.get('/:domain', optionalAuthenticate, (req: AuthenticatedRequest, res) => {
  const { domain } = req.params;
  const layer = layerManager.findByName(domain);
  if (!layer) {
    return res.status(404).json({ error: 'Layer not found' });
  }

  if (!layer.access.public) {
    const roles = req.user?.roles ?? [];
    const isAuthorized = roles.some((role) => layer.access.restrictedRoles?.includes(role));
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Layer is restricted' });
    }
  }

  const users = layerService.getPublicUsers(domain);
  res.json({ layer, users });
});

layerRouter.post('/new', authenticate, requireRoles(['admin']), (req: AuthenticatedRequest, res) => {
  const payload = req.body;
  try {
    const layer = layerService.createLayer({
      name: payload.name,
      color: payload.color,
      opacity: payload.opacity ?? 0.3,
      visible: payload.visible ?? true,
      createdBy: req.user!.id,
      userCount: 0,
      access: payload.access ?? { public: true },
    });
    metricsService.record({
      totalUsers: userService.list().length,
      activeUsers: userService.list().filter((u) => u.status === 'online').length,
      layerCount: layerManager.list().length,
    });
    res.status(201).json({ layer });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

layerRouter.put('/:id', authenticate, requireRoles(['admin', 'moderator']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    const layer = layerService.updateLayer(id, { ...req.body, updatedAt: new Date().toISOString() });
    res.json({ layer });
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});

layerRouter.delete('/:id', authenticate, requireRoles(['admin']), (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    const layer = layerService.removeLayer(id, req.user!.id);
    res.json({ layer });
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
});
