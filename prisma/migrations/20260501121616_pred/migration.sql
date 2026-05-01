-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('user', 'moderator', 'admin');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'banned', 'frozen');

-- CreateEnum
CREATE TYPE "bet_status" AS ENUM ('active', 'won', 'lost', 'cancelled');

-- CreateEnum
CREATE TYPE "bet_direction" AS ENUM ('up', 'down');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('bet_placed', 'bet_won', 'bet_refund', 'subscription_purchase', 'deposit', 'withdrawal', 'referral_bonus', 'airdrop', 'admin_adjustment');

-- CreateEnum
CREATE TYPE "payment_provider" AS ENUM ('stripe', 'telegram_stars', 'ton');

-- CreateEnum
CREATE TYPE "payment_intent_status" AS ENUM ('pending', 'completed', 'failed', 'expired', 'refunded');

-- CreateEnum
CREATE TYPE "subscription_category" AS ENUM ('rounds', 'multipliers', 'passes', 'utility');

-- CreateEnum
CREATE TYPE "chain" AS ENUM ('ton', 'eth', 'bsc', 'polygon', 'solana');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "telegram_id" BIGINT NOT NULL,
    "telegram_username" VARCHAR(64),
    "first_name" VARCHAR(128),
    "last_name" VARCHAR(128),
    "language_code" VARCHAR(8),
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "photo_url" VARCHAR(512),
    "allows_write_to_pm" BOOLEAN NOT NULL DEFAULT false,
    "username" VARCHAR(32),
    "balance" DECIMAL(20,4) NOT NULL DEFAULT 1000,
    "total_wins" INTEGER NOT NULL DEFAULT 0,
    "total_losses" INTEGER NOT NULL DEFAULT 0,
    "best_win_streak" INTEGER NOT NULL DEFAULT 0,
    "score" BIGINT NOT NULL DEFAULT 0,
    "referral_code" VARCHAR(16) NOT NULL,
    "referred_by_id" UUID,
    "role" "user_role" NOT NULL DEFAULT 'user',
    "status" "user_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "last_login_at" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "address" VARCHAR(256) NOT NULL,
    "chain" "chain" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coins" (
    "id" VARCHAR(32) NOT NULL,
    "symbol" VARCHAR(16) NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "binance_symbol" VARCHAR(32) NOT NULL,
    "icon_url" VARCHAR(512),
    "color" VARCHAR(16),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "coin_id" VARCHAR(32) NOT NULL,
    "direction" "bet_direction" NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "multiplier" INTEGER NOT NULL,
    "liquidation_percent" INTEGER NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "entry_price" DECIMAL(30,8) NOT NULL,
    "end_price" DECIMAL(30,8),
    "status" "bet_status" NOT NULL DEFAULT 'active',
    "net_win_amount" DECIMAL(20,4),
    "placed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "resolved_at" TIMESTAMPTZ,

    CONSTRAINT "bets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bet_events" (
    "id" UUID NOT NULL,
    "bet_id" UUID NOT NULL,
    "type" VARCHAR(32) NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bet_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" VARCHAR(64) NOT NULL,
    "category" "subscription_category" NOT NULL,
    "name" VARCHAR(128) NOT NULL,
    "description" TEXT NOT NULL,
    "is_vip_only" BOOLEAN NOT NULL DEFAULT false,
    "is_permanent" BOOLEAN NOT NULL DEFAULT false,
    "badge" VARCHAR(32),
    "accent_color" VARCHAR(32),
    "burn_percent" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_tiers" (
    "id" UUID NOT NULL,
    "subscription_id" VARCHAR(64) NOT NULL,
    "duration_days" INTEGER,
    "price" DECIMAL(20,4) NOT NULL,
    "burn_amount" DECIMAL(20,4) NOT NULL,
    "label" VARCHAR(32) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subscription_id" VARCHAR(64) NOT NULL,
    "tier_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "activated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "transaction_type" NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "balance_after" DECIMAL(20,4) NOT NULL,
    "reference_type" VARCHAR(32),
    "reference_id" VARCHAR(64),
    "idempotency_key" VARCHAR(256),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "referred_id" UUID NOT NULL,
    "total_earned" DECIMAL(20,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_snapshots" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "period" VARCHAR(16) NOT NULL,
    "position" INTEGER NOT NULL,
    "score" BIGINT NOT NULL,
    "balance" DECIMAL(20,4) NOT NULL,
    "snapped_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ranks" (
    "id" VARCHAR(16) NOT NULL,
    "name" VARCHAR(32) NOT NULL,
    "min_balance" DECIMAL(20,4) NOT NULL,
    "tier_order" INTEGER NOT NULL,
    "icon_url" VARCHAR(512),
    "gif_url" VARCHAR(512),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ranks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_packages" (
    "id" UUID NOT NULL,
    "amount" DECIMAL(20,4) NOT NULL,
    "bonus_amount" DECIMAL(20,4) NOT NULL,
    "bonus_percent" INTEGER NOT NULL,
    "price_usd" DECIMAL(10,2) NOT NULL,
    "tag" VARCHAR(32),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_intents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "provider" "payment_provider" NOT NULL,
    "provider_intent_id" VARCHAR(256),
    "status" "payment_intent_status" NOT NULL DEFAULT 'pending',
    "amount_usd" DECIMAL(10,2) NOT NULL,
    "pred_amount" DECIMAL(20,4) NOT NULL,
    "idempotency_key" VARCHAR(256),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "payment_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_candles" (
    "coin_id" VARCHAR(32) NOT NULL,
    "interval" VARCHAR(8) NOT NULL,
    "open_time" TIMESTAMPTZ NOT NULL,
    "open" DECIMAL(30,8) NOT NULL,
    "high" DECIMAL(30,8) NOT NULL,
    "low" DECIMAL(30,8) NOT NULL,
    "close" DECIMAL(30,8) NOT NULL,
    "volume" DECIMAL(30,8) NOT NULL,
    "close_time" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "price_candles_pkey" PRIMARY KEY ("coin_id","interval","open_time")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "target_type" VARCHAR(32),
    "target_id" VARCHAR(64),
    "payload" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(512),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "users"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_referral_code_key" ON "users"("referral_code");

-- CreateIndex
CREATE INDEX "users_score_idx" ON "users"("score" DESC);

-- CreateIndex
CREATE INDEX "users_telegram_username_idx" ON "users"("telegram_username");

-- CreateIndex
CREATE INDEX "users_referred_by_id_idx" ON "users"("referred_by_id");

-- CreateIndex
CREATE INDEX "wallets_user_id_idx" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_address_chain_key" ON "wallets"("address", "chain");

-- CreateIndex
CREATE INDEX "bets_user_id_status_idx" ON "bets"("user_id", "status");

-- CreateIndex
CREATE INDEX "bets_expires_at_idx" ON "bets"("expires_at");

-- CreateIndex
CREATE INDEX "bets_user_id_placed_at_idx" ON "bets"("user_id", "placed_at" DESC);

-- CreateIndex
CREATE INDEX "bet_events_bet_id_created_at_idx" ON "bet_events"("bet_id", "created_at");

-- CreateIndex
CREATE INDEX "subscriptions_category_idx" ON "subscriptions"("category");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_tiers_subscription_id_duration_days_key" ON "subscription_tiers"("subscription_id", "duration_days");

-- CreateIndex
CREATE INDEX "user_subscriptions_user_id_subscription_id_idx" ON "user_subscriptions"("user_id", "subscription_id");

-- CreateIndex
CREATE INDEX "user_subscriptions_expires_at_idx" ON "user_subscriptions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_idempotency_key_key" ON "transactions"("idempotency_key");

-- CreateIndex
CREATE INDEX "transactions_user_id_created_at_idx" ON "transactions"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_reference_type_reference_id_idx" ON "transactions"("reference_type", "reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referred_id_key" ON "referrals"("referred_id");

-- CreateIndex
CREATE INDEX "referrals_referrer_id_idx" ON "referrals"("referrer_id");

-- CreateIndex
CREATE INDEX "leaderboard_snapshots_period_position_idx" ON "leaderboard_snapshots"("period", "position");

-- CreateIndex
CREATE INDEX "leaderboard_snapshots_user_id_period_idx" ON "leaderboard_snapshots"("user_id", "period");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_idempotency_key_key" ON "payment_intents"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intents_provider_provider_intent_id_key" ON "payment_intents"("provider", "provider_intent_id");

-- CreateIndex
CREATE INDEX "audit_log_actor_id_created_at_idx" ON "audit_log"("actor_id", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_id_fkey" FOREIGN KEY ("referred_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bets" ADD CONSTRAINT "bets_coin_id_fkey" FOREIGN KEY ("coin_id") REFERENCES "coins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bet_events" ADD CONSTRAINT "bet_events_bet_id_fkey" FOREIGN KEY ("bet_id") REFERENCES "bets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_tiers" ADD CONSTRAINT "subscription_tiers_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "subscription_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "deposit_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_candles" ADD CONSTRAINT "price_candles_coin_id_fkey" FOREIGN KEY ("coin_id") REFERENCES "coins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
