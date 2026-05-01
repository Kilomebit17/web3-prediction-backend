import { validate, parse, type ValidateValue } from '@telegram-apps/init-data-node';
import type { User as TelegramUser } from '@telegram-apps/init-data-node';

export interface ParsedInitData {
  authDate: Date;
  hash: string;
  user: TelegramUser;
  startParam?: string;
  queryId?: string;
  chatInstance?: string;
  receiver?: TelegramUser;
}

export class AuthDataExpiredError extends Error {
  public readonly code = 'AUTH_DATA_EXPIRED';
  constructor() {
    super('Telegram initData has expired');
    this.name = 'AuthDataExpiredError';
  }
}

export class InvalidSignatureError extends Error {
  public readonly code = 'INVALID_SIGNATURE';
  constructor() {
    super('Invalid Telegram initData signature');
    this.name = 'InvalidSignatureError';
  }
}

export class TelegramInitDataVerifier {
  private readonly botToken: string;
  private readonly authDataTTL: number;

  constructor(botToken: string, authDataTTLSeconds: number) {
    this.botToken = botToken;
    this.authDataTTL = authDataTTLSeconds;
  }

  verify(raw: ValidateValue, opts?: { maxAgeSec?: number }): ParsedInitData {
    const maxAge = opts?.maxAgeSec ?? this.authDataTTL;

    try {
      validate(raw, this.botToken, { expiresIn: maxAge });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (e && typeof e === 'object' && 'type' in e && (e as Record<string, unknown>).type === 'ExpiredError') {
        throw new AuthDataExpiredError();
      }
      if (msg.includes('expired')) {
        throw new AuthDataExpiredError();
      }
      throw new InvalidSignatureError();
    }

    const parsed = parse(raw);

    if (!parsed.user) {
      throw new InvalidSignatureError();
    }

    return {
      authDate: parsed.auth_date,
      hash: parsed.hash,
      user: parsed.user,
      startParam: parsed.start_param,
      queryId: parsed.query_id,
      chatInstance: parsed.chat_instance,
      receiver: parsed.receiver,
    };
  }
}

export type { TelegramUser };
