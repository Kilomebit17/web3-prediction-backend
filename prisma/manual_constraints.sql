-- Run this after `prisma migrate dev --name init`
-- Apply via: psql $DATABASE_URL -f prisma/manual_constraints.sql
-- Or: prisma migrate dev --name add_constraints --create-only → paste into generated file → prisma migrate dev

-- CHECK: user balance cannot go negative
ALTER TABLE users
  ADD CONSTRAINT chk_users_balance_non_negative CHECK (balance >= 0);

-- CHECK: telegram_id must be a positive integer
ALTER TABLE users
  ADD CONSTRAINT chk_users_telegram_id_positive CHECK (telegram_id > 0);

-- PARTIAL UNIQUE: one active subscription per user per subscription type
-- Prisma does not support partial unique indexes in schema.prisma (v5.x limitation)
CREATE UNIQUE INDEX CONCURRENTLY idx_user_subscriptions_active_unique
  ON user_subscriptions (user_id, subscription_id)
  WHERE is_active = TRUE;
