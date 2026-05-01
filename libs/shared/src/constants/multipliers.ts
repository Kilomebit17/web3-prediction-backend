// ROADMAP §3.6: game constants — seeded to DB, used in domain formulas
export const MULTIPLIER_TABLE: ReadonlyArray<{ value: number; liquidationPercent: number }> = [
  { value: 2,  liquidationPercent: 10 },
  { value: 3,  liquidationPercent: 15 },
  { value: 4,  liquidationPercent: 20 },
  { value: 5,  liquidationPercent: 30 },
  { value: 6,  liquidationPercent: 35 },
  { value: 7,  liquidationPercent: 40 },
  { value: 8,  liquidationPercent: 45 },
  { value: 9,  liquidationPercent: 50 },
  { value: 10, liquidationPercent: 59 },
] as const;

export const SCORE_TABLE: ReadonlyArray<{ multiplier: number; win: number; lose: number }> = [
  { multiplier: 2,  win: 20,  lose: 2  },
  { multiplier: 3,  win: 30,  lose: 5  },
  { multiplier: 4,  win: 40,  lose: 10 },
  { multiplier: 5,  win: 50,  lose: 20 },
  { multiplier: 6,  win: 60,  lose: 25 },
  { multiplier: 7,  win: 70,  lose: 30 },
  { multiplier: 8,  win: 80,  lose: 40 },
  { multiplier: 9,  win: 90,  lose: 50 },
  { multiplier: 10, win: 100, lose: 59 },
] as const;

export const ALLOWED_DURATIONS_SECONDS = [30, 120, 300, 3600, 14400, 86400] as const;
export type AllowedDuration = (typeof ALLOWED_DURATIONS_SECONDS)[number];
