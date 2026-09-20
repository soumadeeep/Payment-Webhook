import Redis from 'ioredis';

let redisClient = null;

export function getRedisClient(url = process.env.REDIS_URL || 'redis://localhost:6379') {
  if (!redisClient) {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3, // If a Redis request fails, the client will retry it up to 3 times.
      enableReadyCheck: true, // Before considering the Redis connection ready, check that Redis is actually ready to accept commands.
      retryStrategy(times) {
        return Math.min(times * 200, 2000); // This controls how long to wait before reconnecting to Redis after the connection is lost. Wait times × 200ms, but never wait more than 2 seconds.
      },
    });

    redisClient.on('connect', () => {
      console.log('[Redis]: Connected successfully');
    });

    redisClient.on('error', (err) => {
      console.error('[Redis Error]:', err.message);
    });
  }
  return redisClient;
}