import type { Redis } from 'ioredis';

export function getRedisClient(url?: string): Redis;
