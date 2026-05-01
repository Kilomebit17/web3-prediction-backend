import {
  Controller, Get, Post, Param, Body, Query, HttpCode, HttpStatus,
  HttpException, UseGuards, Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import {
  PurchaseSubscriptionUseCase, GetSubscriptionsUseCase,
  type PurchaseSubscriptionOutput,
  type SubCatalogDTO, type UserActiveSubDTO,
} from '@pred/application';

@ApiTags('Market')
@Controller({ path: 'market', version: '1' })
export class MarketController {
  constructor(
    private readonly purchaseSub: PurchaseSubscriptionUseCase,
    private readonly getSubs: GetSubscriptionsUseCase,
  ) {}

  @Get('subscriptions')
  @ApiOperation({ summary: 'List subscriptions' })
  async list(@Query('category') category?: string): Promise<SubCatalogDTO[]> {
    return this.getSubs.executeAll(category);
  }

  @Get('subscriptions/:id')
  @ApiOperation({ summary: 'Get subscription detail' })
  async getOne(@Param('id') id: string): Promise<SubCatalogDTO | null> {
    return this.getSubs.executeById(id);
  }

  @Post('subscriptions/purchase')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Purchase subscription' })
  async purchase(
    @CurrentUser() user: AuthUser,
    @Body() body: { subscriptionId: string; tierId: string },
    @Headers('Idempotency-Key') _key: string,
  ): Promise<PurchaseSubscriptionOutput> {
    try {
      return await this.purchaseSub.execute({
        userId: user.id, subscriptionId: body.subscriptionId, tierId: body.tierId,
      });
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err) {
        const e = err as Error & { code: string };
        if (e.code === 'INSUFFICIENT_BALANCE')
          throw new HttpException({ type: 'https://pred.game/errors/insufficient-balance', title: e.message, status: 422, code: 'INSUFFICIENT_BALANCE' }, 422);
        if (e.code === 'SUBSCRIPTION_REQUIRED')
          throw new HttpException({ type: 'https://pred.game/errors/subscription-required', title: e.message, status: 422, code: 'SUBSCRIPTION_REQUIRED' }, 422);
      }
      throw err;
    }
  }

  @Get('my-subscriptions')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get my active subscriptions' })
  async mySubs(@CurrentUser() user: AuthUser): Promise<UserActiveSubDTO[]> {
    return this.getSubs.executeUserActive(user.id);
  }
}
