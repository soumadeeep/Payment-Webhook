import { getRedisClient } from '@fintech/redis';

const redis = getRedisClient();

export const IdempotencyStatus = {
  FIRST_ATTEMPT: 'FIRST_ATTEMPT', // when we insert first time in redis
  IN_FLIGHT: 'IN_FLIGHT', // the event are processing by some thread
  ALREADY_COMPLETED: 'ALREADY_COMPLETED', // message acknoledge waiting for delate
};

export async function checkAndLockEvent(eventId, ttlSeconds = 30) {
  const key = `idempotency:payment:${eventId}`;

  // 1. Atomic SETNX with TTL
  const acquired = await redis.set(key, 'PROCESSING', 'EX', ttlSeconds, 'NX');

  if (acquired === 'OK') {
    return { status: IdempotencyStatus.FIRST_ATTEMPT };
  }

  // 2. If not acquired, inspect current state
  const currentState = await redis.get(key);

  if (currentState === 'COMPLETED') {
    return { status: IdempotencyStatus.ALREADY_COMPLETED };
  }

  return { status: IdempotencyStatus.IN_FLIGHT };
}

export async function markEventCompleted(eventId, retentionSeconds = 180) {
  const key = `idempotency:payment:${eventId}`;
  await redis.set(key, 'COMPLETED', 'EX', retentionSeconds);
}

export async function releaseEventLock(eventId) {
  const key = `idempotency:payment:${eventId}`;
  await redis.del(key);
}