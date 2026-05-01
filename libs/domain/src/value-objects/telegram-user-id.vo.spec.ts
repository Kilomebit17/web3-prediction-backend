import { DomainError } from '../errors/domain.error';
import { TelegramUserId } from './telegram-user-id.vo';

describe('TelegramUserId', () => {
  it('creates from positive bigint', () => {
    const id = TelegramUserId.of(123456789n);
    expect(id.value).toBe(123456789n);
  });

  it('creates from positive number', () => {
    const id = TelegramUserId.of(123456789);
    expect(id.value).toBe(123456789n);
  });

  it('creates from numeric string', () => {
    const id = TelegramUserId.of('987654321');
    expect(id.value).toBe(987654321n);
  });

  it('throws on zero', () => {
    expect(() => TelegramUserId.of(0)).toThrow(DomainError);
  });

  it('throws on negative number', () => {
    expect(() => TelegramUserId.of(-1)).toThrow(DomainError);
  });

  it('throws on negative bigint', () => {
    expect(() => TelegramUserId.of(-1n)).toThrow(DomainError);
  });
});
