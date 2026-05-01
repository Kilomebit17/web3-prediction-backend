import { Injectable, Inject } from '@nestjs/common';

export interface CreatePaymentIntentInput {
  userId: string;
  packageId: string;
  provider: 'stripe' | 'telegram_stars' | 'ton';
  idempotencyKey: string;
}

export interface PaymentIntentResult {
  id: string;
  provider: string;
  status: string;
  amountUsd: string;
  predAmount: string;
  paymentUrl: string | null;
  createdAt: string;
}

interface IDepositRepo {
  findPackageById(id: string): Promise<{ amount: string; bonusAmount: string; priceUsd: string; tag: string | null } | null>;
  findIntentByIdempotencyKey(key: string): Promise<PaymentIntentResult | null>;
  createPaymentIntent(params: {
    userId: string; packageId: string; provider: string;
    amountUsd: number; predAmount: number; idempotencyKey: string;
  }): Promise<{ id: string; createdAt: string }>;
}

interface ITelegramStarsAdapter {
  createInvoiceLink(params: {
    title: string; description: string; payload: string;
    amount: number; photoUrl?: string;
  }): Promise<string>;
}

export const DEPOSIT_REPO = Symbol('IDepositRepository');
export const TELEGRAM_STARS_ADAPTER = Symbol('ITelegramStarsAdapter');

@Injectable()
export class CreatePaymentIntentUseCase {
  constructor(
    @Inject(DEPOSIT_REPO) private readonly depositRepo: IDepositRepo,
    @Inject(TELEGRAM_STARS_ADAPTER) private readonly telegramStars: ITelegramStarsAdapter,
  ) {}

  async execute(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
    const existing = await this.depositRepo.findIntentByIdempotencyKey(input.idempotencyKey);
    if (existing) return existing;

    const pkg = await this.depositRepo.findPackageById(input.packageId);
    if (!pkg) throw Object.assign(new Error('Package not found'), { code: 'NOT_FOUND' });

    const amountUsd = parseFloat(pkg.priceUsd);
    const predAmount = parseFloat(pkg.amount) + parseFloat(pkg.bonusAmount);

    const intent = await this.depositRepo.createPaymentIntent({
      userId: input.userId, packageId: input.packageId,
      provider: input.provider, amountUsd, predAmount,
      idempotencyKey: input.idempotencyKey,
    });

    let paymentUrl: string | null = null;

    if (input.provider === 'telegram_stars') {
      const stars = Math.round(amountUsd * 100); // 1 USD ≈ 100 Stars
      paymentUrl = await this.telegramStars.createInvoiceLink({
        title: `PRED ${pkg.tag ?? 'Pack'}`,
        description: `${predAmount} PRED tokens`,
        payload: intent.id,
        amount: stars,
      });
    } else if (input.provider === 'stripe') {
      // TODO: Integrate real Stripe Checkout Session creation (Phase 3)
      paymentUrl = `https://checkout.stripe.com/pay/${intent.id}`;
    }
    // TON provider: paymentUrl stays null — Phase 3.5 on-chain deposit listener

    return {
      id: intent.id, provider: input.provider, status: 'pending',
      amountUsd: amountUsd.toFixed(2), predAmount: predAmount.toFixed(4),
      paymentUrl, createdAt: intent.createdAt,
    };
  }
}
