export interface UserDTO {
  id: string;
  telegramId: string;
  telegramUsername: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  isPremium: boolean;
  photoUrl: string | null;
  username: string | null;
  balance: string;
  totalWins: number;
  totalLosses: number;
  bestWinStreak: number;
  score: string;
  referralCode: string;
  referredById: string | null;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}
