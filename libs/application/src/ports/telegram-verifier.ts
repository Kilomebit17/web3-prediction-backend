export interface TelegramUserData {
  id: number;
  username?: string;
  firstName: string;
  lastName?: string;
  languageCode?: string;
  isPremium?: boolean;
  photoUrl?: string;
  allowsWriteToPm?: boolean;
}

export interface ParsedTelegramInitData {
  authDate: Date;
  hash: string;
  user: TelegramUserData;
  startParam?: string;
}

export interface ITelegramVerifier {
  verify(initDataRaw: string, opts?: { maxAgeSec?: number }): ParsedTelegramInitData;
}

export const TELEGRAM_VERIFIER = Symbol('ITelegramVerifier');
