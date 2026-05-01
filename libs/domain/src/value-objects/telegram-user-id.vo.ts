import { DomainError } from '../errors/domain.error';

export class TelegramUserId {
  private constructor(public readonly value: bigint) {}

  static of(v: bigint | number | string): TelegramUserId {
    const raw = typeof v === 'bigint' ? v : BigInt(v);
    if (raw <= 0n) {
      throw new DomainError('INVALID_TELEGRAM_ID', `Telegram ID must be positive, got ${v}`);
    }
    return new TelegramUserId(raw);
  }
}
