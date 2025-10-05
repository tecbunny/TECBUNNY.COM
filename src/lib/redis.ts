import Redis from 'ioredis';

import { logger } from './logger';

let client: Redis | null = null;
let initializing = false;

export function getRedis(): Redis | null {
  if (client) return client;
  if (initializing) return null;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  initializing = true;
  try {
    client = new Redis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: false });
  client.on('error', (e: any) => logger.warn('redis_error', { error: (e as Error).message }));
    client.on('connect', () => logger.info('redis_connect'));
  } catch (e) {
    logger.error('redis_init_failed', { error: (e as Error).message });
    client = null;
  } finally {
    initializing = false;
  }
  return client;
}

export async function redisPing(): Promise<boolean> {
  const r = getRedis();
  if (!r) return false;
  try {
    const res = await r.ping();
    return res === 'PONG';
  } catch {
    return false;
  }
}
