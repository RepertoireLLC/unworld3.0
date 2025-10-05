import NodeCache from 'node-cache';

export const createCache = (ttlSeconds: number) => new NodeCache({ stdTTL: ttlSeconds, useClones: false });
