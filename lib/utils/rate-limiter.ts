import { Redis } from 'ioredis';

export class RateLimiter {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async checkLimit(key: string, limit: number, window: number): Promise<boolean> {
    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, window);
    }
    return current <= limit;
  }

  async getRemaining(key: string, limit: number): Promise<number> {
    const current = await this.redis.get(key);
    return Math.max(0, limit - parseInt(current || '0'));
  }

  async resetLimit(key: string): Promise<void> {
    await this.redis.del(key);
  }
}