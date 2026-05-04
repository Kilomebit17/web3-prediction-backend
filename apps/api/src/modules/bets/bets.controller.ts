import {
  Controller, Post, Get, Param, Body, Query, Headers,
  HttpCode, HttpStatus, HttpException, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import {
  PlaceBetUseCase, CancelBetUseCase, GetBetHistoryUseCase,
  type BetDTO, type BetStatsSummary,
} from '@pred/application';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { PlaceBetDto } from './dto/place-bet.dto';

@ApiTags('Bets')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'bets', version: '1' })
export class BetsController {
  constructor(
    private readonly placeBet: PlaceBetUseCase,
    private readonly cancelBet: CancelBetUseCase,
    private readonly betHistory: GetBetHistoryUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place a new bet' })
  @ApiResponse({ status: 201, description: 'Bet created' })
  async place(
    @CurrentUser() user: AuthUser,
    @Body() dto: PlaceBetDto,
    @Headers('Idempotency-Key') idempotencyKey: string,
  ): Promise<BetDTO> {
    if (!idempotencyKey) {
      throw new HttpException(
        { message: 'Idempotency-Key header required', status: 400 }, 400);
    }
    try {
      return await this.placeBet.execute({
        userId: user.id, coinId: dto.coinId, direction: dto.direction,
        amount: dto.amount, multiplier: dto.multiplier,
        durationSeconds: dto.durationSeconds, idempotencyKey,
      });
    } catch (err: unknown) { throw this.mapBetError(err); }
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an active bet' })
  async cancel(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<BetDTO> {
    try { return await this.cancelBet.execute({ userId: user.id, betId: id }); }
    catch (err: unknown) { throw this.mapBetError(err); }
  }

  @Get('active')
  @ApiOperation({ summary: 'List active bets' })
  async getActive(@CurrentUser() user: AuthUser): Promise<BetDTO[]> {
    return this.betHistory.getActive(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get bet history with cursor pagination' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'coin_id', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getHistory(
    @CurrentUser() user: AuthUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('coin_id') coinId?: string,
    @Query('status') status?: string,
  ): Promise<{ data: BetDTO[]; meta: { nextCursor: string | null } }> {
    const result = await this.betHistory.getHistory({
      userId: user.id, cursor, limit: limit ? parseInt(limit, 10) : undefined, coinId, status,
    });
    return { data: result.data, meta: { nextCursor: result.nextCursor } };
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get bet statistics' })
  async getStats(@CurrentUser() user: AuthUser): Promise<BetStatsSummary> {
    return this.betHistory.getStats(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bet by ID' })
  async getById(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<BetDTO> {
    try {
      return await this.betHistory.getById(user.id, id);
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as Error & { code: string }).code === 'NOT_FOUND') {
        throw new HttpException(
          { message: err.message, status: 404 }, 404);
      }
      throw err;
    }
  }

  private mapBetError(err: unknown): HttpException {
    if (err instanceof Error && 'code' in err) {
      const e = err as Error & { code: string; fields?: Record<string, string[]> };
      switch (e.code) {
        case 'INSUFFICIENT_BALANCE':
          return new HttpException({ message: e.message, status: 422 }, 422);
        case 'INVALID_INPUT':
          return new HttpException({ message: e.message, status: 400 }, 400);
        case 'FORBIDDEN':
          return new HttpException({ message: e.message, status: 403 }, 403);
        case 'BET_EXPIRED':
          return new HttpException({ message: e.message, status: 422 }, 422);
        case 'SUBSCRIPTION_REQUIRED':
          return new HttpException({ message: e.message, status: 402 }, 402);
        case 'NOT_FOUND':
          return new HttpException({ message: e.message, status: 404 }, 404);
      }
    }
    throw err;
  }
}
