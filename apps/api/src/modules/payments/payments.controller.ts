import {
  Controller, Get, Post, Param, Body, Headers,
  HttpCode, HttpStatus, HttpException, UseGuards, Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import {
  CreatePaymentIntentUseCase, ProcessDepositCompletionUseCase,
  DEPOSIT_REPO, TELEGRAM_STARS_ADAPTER,
  type PaymentIntentResult, type CreatePaymentIntentInput,
} from '@pred/application';
import type { DepositPackageDTO, PaymentIntentDTO } from '@pred/infrastructure';
import type { TelegramStarsAdapter } from '@pred/infrastructure';

interface IDepositRepo {
  findActivePackages(): Promise<DepositPackageDTO[]>;
  findIntentById(id: string): Promise<PaymentIntentDTO | null>;
  findIntentByIdempotencyKey(key: string): Promise<PaymentIntentDTO | null>;
  completeIntent(id: string, providerIntentId: string): Promise<PaymentIntentDTO>;
}

@ApiTags('Payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(
    private readonly createIntentUseCase: CreatePaymentIntentUseCase,
    private readonly processCompletionUseCase: ProcessDepositCompletionUseCase,
    @Inject(DEPOSIT_REPO) private readonly depositRepo: IDepositRepo,
    @Inject(TELEGRAM_STARS_ADAPTER) private readonly telegramStars: TelegramStarsAdapter,
  ) {}

  @Get('packages')
  @ApiOperation({ summary: 'List active deposit packages' })
  async packages(): Promise<DepositPackageDTO[]> {
    return this.depositRepo.findActivePackages();
  }

  @Post('intents')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create payment intent' })
  async createIntent(
    @CurrentUser() user: AuthUser,
    @Body() body: { packageId: string; provider: string },
    @Headers('Idempotency-Key') idempotencyKey: string,
  ): Promise<PaymentIntentResult> {
    if (!idempotencyKey) {
      throw new HttpException(
        { type: 'https://pred.game/errors/invalid-input', title: 'Idempotency-Key header required', status: 400, code: 'INVALID_INPUT' }, 400);
    }
    return this.createIntentUseCase.execute({
      userId: user.id, packageId: body.packageId,
      provider: body.provider as CreatePaymentIntentInput['provider'],
      idempotencyKey,
    });
  }

  @Get('intents/:id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get payment intent status' })
  async getIntent(@Param('id') id: string): Promise<PaymentIntentDTO> {
    const intent = await this.depositRepo.findIntentById(id);
    if (!intent) throw new HttpException(
      { type: 'https://pred.game/errors/not-found', title: 'Intent not found', status: 404, code: 'NOT_FOUND' }, 404);
    return intent;
  }

  // TODO Phase 3: Real Stripe integration — signature verification, idempotency
  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe webhook handler (future)' })
  async stripeWebhook(
    @Body() body: { type: string; data: { object: { id: string; metadata?: { intentId?: string } } } },
    @Headers('stripe-signature') _signature: string,
  ): Promise<void> {
    if (body.type === 'checkout.session.completed') {
      const intentId = body.data.object.metadata?.intentId;
      if (intentId) {
        await this.processCompletionUseCase.execute({
          intentId,
          providerIntentId: body.data.object.id,
        });
      }
    }
  }

  @Post('webhook/telegram')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telegram webhook handler (Stars payments)' })
  async telegramWebhook(
    @Body() body: { pre_checkout_query?: { id: string; from: { id: number }; currency: string; total_amount: number; invoice_payload: string }; message?: { successful_payment?: { currency: string; total_amount: number; invoice_payload: string; telegram_payment_charge_id: string; provider_payment_charge_id: string } } },
    @Headers('x-telegram-bot-api-secret-token') secretToken: string,
  ): Promise<Record<string, unknown>> {
    // Verify webhook secret
    if (!this.telegramStars.verifyWebhookSecret(secretToken)) {
      throw new HttpException(
        { type: 'https://pred.game/errors/forbidden', title: 'Invalid webhook secret', status: 403, code: 'FORBIDDEN' }, 403);
    }

    // Handle pre_checkout_query — must be answered within 10 seconds
    if (body.pre_checkout_query) {
      const q = body.pre_checkout_query;
      const intent = await this.depositRepo.findIntentById(q.invoice_payload);
      if (intent) {
        await this.telegramStars.answerPreCheckoutQuery(q.id, true);
      } else {
        await this.telegramStars.answerPreCheckoutQuery(q.id, false, 'Payment intent not found');
      }
      return { ok: true };
    }

    // Handle successful_payment
    if (body.message?.successful_payment) {
      const p = body.message.successful_payment;
      await this.processCompletionUseCase.execute({
        intentId: p.invoice_payload,
        providerIntentId: p.telegram_payment_charge_id,
      });
      return { ok: true };
    }

    return { ok: true };
  }

  // TODO Phase 3.5: TON on-chain deposit listener — monitor TON wallet for incoming transfers
  @Post('webhook/ton')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'TON payment webhook handler (future)' })
  async tonWebhook(@Body() _body: unknown): Promise<void> {}

}
