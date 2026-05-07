export interface UserDTO {
  firstName: string | null;
  lastName: string | null;
  isPremium: boolean;
  photoUrl: string | null;
  balance: string;
  referralCode: string;
  referredById: string | null;
  status: string;
  isFirstDeposit: boolean;
}
