import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import type { ICacheProvider } from '@pred/application';

@Injectable()
export class RedisCacheService implements ICacheProvider, OnModuleInit, OnModuleDestroy {
  private redis: Redis | null = null;
  private readonly redisUrl: string;

  constructor() {
    this.redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  }

  onModuleInit(): void {
    this.redis = new Redis(this.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
      enableOfflineQueue: false,
    });
    this.redis.on('error', (err: Error) => {
      // Log but don't crash — Redis is a cache, not a primary store
      console.error('[RedisCacheService] connection error:', err.message);
    });
  }

  onModuleDestroy(): void {
    if (this.redis) {
      this.redis.disconnect();
      this.redis = null;
    }
  }

  private ensureClient(): Redis {
    if (!this.redis) throw new Error('Redis client not initialized');
    return this.redis;
  }

  async get<T = string>(key: string): Promise<T | null> {
    const raw = await this.ensureClient().get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const client = this.ensureClient();
    if (ttlSeconds !== undefined) {
      await client.set(key, value, 'EX', ttlSeconds);
    } else {
      await client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.ensureClient().del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.ensureClient().exists(key);
    return result === 1;
  }

  async sadd(key: string, member: string): Promise<void> {
    await this.ensureClient().sadd(key, member);
  }

  async srem(key: string, member: string): Promise<void> {
    await this.ensureClient().srem(key, member);
  }

  async smembers(key: string): Promise<string[]> {
    return this.ensureClient().smembers(key);
  }

  async lpush(key: string, value: string): Promise<void> {
    await this.ensureClient().lpush(key, value);
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.ensureClient().zadd(key, score, member);
  }

  async zrem(key: string, member: string): Promise<void> {
    await this.ensureClient().zrem(key, member);
  }

  async zcard(key: string): Promise<number> {
    return this.ensureClient().zcard(key);
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.ensureClient().zrange(key, start, stop);
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.ensureClient().zrevrange(key, start, stop);
  }

  async zremByUser(key: string, userId: string, count = 100): Promise<number> {
    const client = this.ensureClient();
    const pattern = `${userId}:*`;
    let removed = 0;
    let cursor = 0;
    do {
      const [nextCursor, results] = await client.zscan(
        key,
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        count,
      );
      cursor = parseInt(nextCursor, 10);
      for (let i = 0; i < results.length; i += 2) {
        const member = results[i];
        if (member) {
          await client.zrem(key, member);
          removed++;
        }
      }
    } while (cursor !== 0);
    return removed;
  }

  async zrevrank(key: string, member: string): Promise<number | null> {
    const result = await this.ensureClient().zrevrank(key, member);
    return result;
  }
}
