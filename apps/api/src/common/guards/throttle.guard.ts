import { HttpException } from '@nestjs/common';
import type { ICacheProvider } from '@pred/application';

export function Throttle(limitPerMin: number) {
  return function (_target: object, _propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value as (...args: unknown[]) => unknown;
    descriptor.value = async function (this: { cache?: ICacheProvider }, ...args: unknown[]) {
      const request = args.find((a) => a && typeof a === 'object' && 'ip' in (a as object)) as { ip?: string; headers?: Record<string, string> } | undefined;
      const ip = request?.ip ?? request?.headers?.['x-forwarded-for'] ?? 'unknown';
      const cache = (this as { cache?: ICacheProvider }).cache;
      if (!cache) return original.apply(this, args);

      const key = `rate_limit:${ip}`;
      const current = parseInt((await cache.get<string>(key)) ?? '0', 10);
      if (current >= limitPerMin) {
        throw new HttpException(
          { type: 'https://pred.game/errors/rate-limited', title: 'Too many requests', status: 429, code: 'RATE_LIMITED' },
          429,
        );
      }
      await cache.set(key, String(current + 1), 60);
      return original.apply(this, args);
    };
  };
}
