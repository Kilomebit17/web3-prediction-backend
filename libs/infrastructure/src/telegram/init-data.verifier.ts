import { validate, parse, type ValidateValue } from '@telegram-apps/init-data-node';

export interface CamelUser {
  addedToAttachmentMenu?: boolean;
  allowsWriteToPm?: boolean;
  firstName: string;
  id: number;
  isBot?: boolean;
  isPremium?: boolean;
  lastName?: string;
  languageCode?: string;
  photoUrl?: string;
  username?: string;
}

export interface ParsedInitData {
  authDate: Date;
  hash: string;
  user: CamelUser;
  startParam?: string;
  queryId?: string;
  chatInstance?: string;
  receiver?: CamelUser;
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

    const parsed = parse(raw, true);

    if (!parsed.user) {
      throw new InvalidSignatureError();
    }

    return {
      authDate: parsed.authDate,
      hash: parsed.hash,
      user: parsed.user as CamelUser,
      startParam: parsed.startParam,
      queryId: parsed.queryId,
      chatInstance: parsed.chatInstance,
      receiver: parsed.receiver as CamelUser | undefined,
    };
  }
}
