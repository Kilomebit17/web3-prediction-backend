import { Injectable } from '@nestjs/common';
import { STARS_PER_USD } from '@pred/application';

export interface TelegramInvoice {
  invoiceLink: string;
  payload: string;
}

export interface TelegramSuccessfulPayment {
  currency: string;
  totalAmount: number;
  invoicePayload: string;
  telegramPaymentChargeId: string;
  providerPaymentChargeId: string;
}

export interface TelegramPreCheckoutQuery {
  id: string;
  from: { id: number };
  currency: string;
  totalAmount: number;
  invoicePayload: string;
}

@Injectable()
export class TelegramStarsAdapter {
  private readonly botToken: string;
  private readonly apiBase: string;
  private readonly webhookSecret: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN ?? '';
    this.apiBase = `https://api.telegram.org/bot${this.botToken}`;
    this.webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET ?? this.botToken;
  }

  async createInvoiceLink(params: {
    title: string;
    description: string;
    payload: string;
    amount: number; // in Stars (~42 Stars ≈ 1 USD)
    photoUrl?: string;
  }): Promise<string> {
    const body = {
      title: params.title,
      description: params.description,
      payload: params.payload,
      currency: 'XTR',
      prices: [{ label: params.title, amount: params.amount }],
      photo_url: params.photoUrl,
    };

    const res = await fetch(`${this.apiBase}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as { ok: boolean; result?: string; description?: string };
    if (!data.ok || !data.result) {
      throw new Error(`Telegram API error: ${data.description ?? 'Unknown'}`);
    }
    return data.result;
  }

  async answerPreCheckoutQuery(
    preCheckoutQueryId: string,
    ok: boolean,
    errorMessage?: string,
  ): Promise<void> {
    const body: Record<string, unknown> = {
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
    };
    if (errorMessage) body.error_message = errorMessage;

    await fetch(`${this.apiBase}/answerPreCheckoutQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  verifyWebhookSecret(secret: string): boolean {
    if (!this.webhookSecret) return true; // No secret configured — allow all (dev mode)
    // Constant-time comparison to prevent timing attacks
    const a = Buffer.from(secret);
    const b = Buffer.from(this.webhookSecret);
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      const ai = a[i] ?? 0;
      const bi = b[i] ?? 0;
      diff |= ai ^ bi;
    }
    return diff === 0;
  }

  // Parse USD amount to Telegram Stars (~42 Stars ≈ 1 USD)
  usdToStars(usdAmount: number): number {
    return Math.round(usdAmount * STARS_PER_USD);
  }
}
