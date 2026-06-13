-- =============================================================================
-- Reset Migration: Clear all user-generated data
-- Keeps seed/static data: coins, subscriptions, subscription_tiers,
--   deposit_packages, ranks, price_candles
-- =============================================================================

BEGIN;

-- 1. Truncate child tables first (FK dependency order)
TRUNCATE TABLE bet_events          RESTART IDENTITY CASCADE;
TRUNCATE TABLE user_subscriptions  RESTART IDENTITY CASCADE;
TRUNCATE TABLE transactions        RESTART IDENTITY CASCADE;
TRUNCATE TABLE payment_intents     RESTART IDENTITY CASCADE;
TRUNCATE TABLE referrals           RESTART IDENTITY CASCADE;
TRUNCATE TABLE leaderboard_snapshots RESTART IDENTITY CASCADE;
TRUNCATE TABLE audit_log           RESTART IDENTITY CASCADE;
TRUNCATE TABLE bets                RESTART IDENTITY CASCADE;
TRUNCATE TABLE wallets             RESTART IDENTITY CASCADE;

-- 2. Truncate users last (all FK dependents already cleared)
TRUNCATE TABLE users RESTART IDENTITY CASCADE;

-- 3. Re-seed static reference data from seed script values
-- (these tables were NOT truncated above, but ensure they exist)

-- Re-insert ranks
INSERT INTO ranks (id, name, min_balance, tier_order, created_at)
VALUES
  ('bronze',   'Bronze',   0,         1, NOW()),
  ('silver',   'Silver',   5000,      2, NOW()),
  ('gold',     'Gold',     50000,     3, NOW()),
  ('platinum', 'Platinum', 100000,    4, NOW()),
  ('diamond',  'Diamond',  500000,    5, NOW()),
  ('whale',    'Whale',    1000000,   6, NOW()),
  ('predator', 'Predator', 5000000,   7, NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;
