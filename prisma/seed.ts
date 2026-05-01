// ROADMAP §1.3: Seed — coins, subscriptions (with tiers), ranks, deposit_packages

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type TierInput = { durationDays: number | null; price: number; label: string };

interface SubDef {
  id: string;
  category: 'rounds' | 'multipliers' | 'passes' | 'utility';
  name: string;
  description: string;
  isVipOnly: boolean;
  isPermanent: boolean;
  badge: string | null;
  accentColor: string | null;
  burnPercent: number;
  sortOrder: number;
  tiers: TierInput[];
}

async function main(): Promise<void> {
  console.log('🌱 Seeding database...');

  await seedCoins();
  await seedRanks();
  await seedSubscriptions();
  await seedDepositPackages();

  console.log('✅ Seed complete.');
}

// ─── COINS ────────────────────────────────────────────────────────────────────
async function seedCoins(): Promise<void> {
  const coins = [
    { id: 'bitcoin',  symbol: 'BTC', name: 'Bitcoin',  binanceSymbol: 'BTCUSDT', color: '#F7931A', sortOrder: 1 },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', binanceSymbol: 'ETHUSDT', color: '#627EEA', sortOrder: 2 },
    { id: 'solana',   symbol: 'SOL', name: 'Solana',   binanceSymbol: 'SOLUSDT', color: '#9945FF', sortOrder: 3 },
  ];

  await Promise.all(
    coins.map((coin) => prisma.coin.upsert({ where: { id: coin.id }, create: coin, update: coin })),
  );
  console.log(`  ✓ ${coins.length} coins seeded`);
}

// ─── RANKS ────────────────────────────────────────────────────────────────────
async function seedRanks(): Promise<void> {
  const ranks = [
    { id: 'j1', name: 'J-1', minBalance: 0,        tierOrder: 1 },
    { id: 'e2', name: 'E-2', minBalance: 1000,      tierOrder: 2 },
    { id: 's3', name: 'S-3', minBalance: 100000,    tierOrder: 3 },
    { id: 'u4', name: 'U-4', minBalance: 1000000,   tierOrder: 4 },
    { id: 's5', name: 'S-5', minBalance: 3000000,   tierOrder: 5 },
  ];

  await Promise.all(
    ranks.map((rank) => prisma.rank.upsert({ where: { id: rank.id }, create: rank, update: rank })),
  );
  console.log(`  ✓ ${ranks.length} ranks seeded`);
}

// ─── SUBSCRIPTIONS + TIERS ────────────────────────────────────────────────────
function makeMultiplier(
  mult: number,
  price: number,
  badge: string | null,
  accentColor: string,
  sortOrder: number,
): SubDef {
  return {
    id: `multiplier_x${mult}`,
    category: 'multipliers',
    name: `Multiplier ×${mult}`,
    description: `Permanently unlock ×${mult} multiplier`,
    isVipOnly: false,
    isPermanent: true,
    badge,
    accentColor,
    burnPercent: 60,
    sortOrder,
    tiers: [{ durationDays: null, price, label: 'Lifetime' }],
  };
}

async function seedSubscriptions(): Promise<void> {
  const subs: SubDef[] = [
    // ── ROUNDS ──────────────────────────────────────────────────────────────
    {
      id: 'sniper_round',
      category: 'rounds',
      name: 'Sniper Round',
      description: 'Unlock ultra-fast 30-second rounds',
      isVipOnly: false,
      isPermanent: false,
      badge: 'Hot',
      accentColor: 'orange',
      burnPercent: 60,
      sortOrder: 1,
      tiers: [
        { durationDays: 1,  price: 80,   label: '1 Day'   },
        { durationDays: 7,  price: 440,  label: '7 Days'  },
        { durationDays: 30, price: 1350, label: '30 Days' },
      ],
    },
    {
      id: 'marathon_round',
      category: 'rounds',
      name: 'Marathon Round',
      description: 'Unlock extended 4-hour and 24-hour rounds',
      isVipOnly: false,
      isPermanent: false,
      badge: null,
      accentColor: 'primary',
      burnPercent: 50,
      sortOrder: 2,
      tiers: [
        { durationDays: 7,  price: 350,  label: '7 Days'  },
        { durationDays: 30, price: 1080, label: '30 Days' },
      ],
    },
    {
      id: 'custom_duration',
      category: 'rounds',
      name: 'Custom Duration',
      description: 'Set any round duration from 10 seconds (VIP only)',
      isVipOnly: true,
      isPermanent: false,
      badge: 'VIP',
      accentColor: 'gold',
      burnPercent: 50,
      sortOrder: 3,
      tiers: [
        { durationDays: 7,  price: 900,  label: '7 Days'  },
        { durationDays: 30, price: 3000, label: '30 Days' },
      ],
    },
    // ── UTILITY ─────────────────────────────────────────────────────────────
    {
      id: 'loss_shield',
      category: 'utility',
      name: 'Loss Shield',
      description: 'Partial refund on losing bets',
      isVipOnly: false,
      isPermanent: false,
      badge: 'Popular',
      accentColor: 'profit',
      burnPercent: 40,
      sortOrder: 4,
      tiers: [
        { durationDays: 1,  price: 120,  label: '1 Day'   },
        { durationDays: 7,  price: 720,  label: '7 Days'  },
        { durationDays: 30, price: 2400, label: '30 Days' },
      ],
    },
    // ── PASSES ──────────────────────────────────────────────────────────────
    {
      id: 'pred_pass',
      category: 'passes',
      name: 'PRED Pass',
      description: 'VIP membership: −20% fees, private leaderboard',
      isVipOnly: false,
      isPermanent: false,
      badge: 'VIP',
      accentColor: 'gold',
      burnPercent: 50,
      sortOrder: 5,
      tiers: [
        { durationDays: 7,  price: 1400, label: '7 Days'  },
        { durationDays: 30, price: 4800, label: '30 Days' },
      ],
    },
    {
      id: 'identity_pass',
      category: 'passes',
      name: 'Identity Pass',
      description: 'Custom avatars, frames, and leaderboard glow',
      isVipOnly: false,
      isPermanent: false,
      badge: 'New',
      accentColor: 'primary',
      burnPercent: 100,
      sortOrder: 6,
      tiers: [
        { durationDays: 7,  price: 200, label: '7 Days'  },
        { durationDays: 30, price: 600, label: '30 Days' },
      ],
    },
    // ── MULTIPLIERS ─────────────────────────────────────────────────────────
    makeMultiplier(4,  600,  'Popular', 'yellow',  7),
    makeMultiplier(5,  1200, 'Popular', 'yellow',  8),
    makeMultiplier(6,  2000, null,      'orange',  9),
    makeMultiplier(7,  3000, 'Hot',     'orange',  10),
    makeMultiplier(8,  4500, 'Hot',     'danger',  11),
    makeMultiplier(9,  6500, 'Danger',  'danger',  12),
    makeMultiplier(10, 9000, 'Danger',  'danger',  13),
  ];

  await Promise.all(
    subs.map(async ({ tiers, ...subData }) => {
      await prisma.subscription.upsert({
        where: { id: subData.id },
        create: subData,
        update: subData,
      });
      await Promise.all(
        tiers.map(async (tier) => {
          const burnAmount = (tier.price * subData.burnPercent) / 100;
          const existing = await prisma.subscriptionTier.findFirst({
            where: { subscriptionId: subData.id, durationDays: tier.durationDays ?? null },
          });
          if (existing) {
            return prisma.subscriptionTier.update({
              where: { id: existing.id },
              data: { price: tier.price, burnAmount, label: tier.label },
            });
          }
          return prisma.subscriptionTier.create({
            data: { subscriptionId: subData.id, durationDays: tier.durationDays, price: tier.price, burnAmount, label: tier.label },
          });
        }),
      );
    }),
  );
  console.log(`  ✓ ${subs.length} subscriptions seeded`);
}

// ─── DEPOSIT PACKAGES ────────────────────────────────────────────────────────
async function seedDepositPackages(): Promise<void> {
  const packages = [
    { amount: 500,    bonusPercent: 5,   priceUsd: 0.99,  tag: null,        sortOrder: 1 },
    { amount: 1000,   bonusPercent: 10,  priceUsd: 1.99,  tag: null,        sortOrder: 2 },
    { amount: 5000,   bonusPercent: 25,  priceUsd: 7.99,  tag: 'POPULAR',   sortOrder: 3 },
    { amount: 10000,  bonusPercent: 40,  priceUsd: 14.99, tag: 'BEST_DEAL', sortOrder: 4 },
    { amount: 30000,  bonusPercent: 55,  priceUsd: 39.99, tag: null,        sortOrder: 5 },
    { amount: 50000,  bonusPercent: 70,  priceUsd: 59.99, tag: null,        sortOrder: 6 },
    { amount: 100000, bonusPercent: 100, priceUsd: 99.99, tag: 'WHALE',     sortOrder: 7 },
  ];

  await prisma.depositPackage.deleteMany({});
  await prisma.depositPackage.createMany({
    data: packages.map((p) => ({
      amount: p.amount,
      bonusAmount: Math.round((p.amount * p.bonusPercent) / 100),
      bonusPercent: p.bonusPercent,
      priceUsd: p.priceUsd,
      tag: p.tag,
      sortOrder: p.sortOrder,
    })),
  });
  console.log(`  ✓ ${packages.length} deposit packages seeded`);
}

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────

main()
  .catch((e: unknown) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
