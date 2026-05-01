import { Controller, Get, Post, Delete, Param, Body, HttpCode, HttpStatus, UseGuards, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../../common/decorators/current-user.decorator';
import { LinkWalletUseCase, type WalletDTO } from '@pred/application';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'users', version: '1' })
export class WalletsController {
  constructor(private readonly linkWallet: LinkWalletUseCase) {}

  @Get('me/wallets')
  @ApiOperation({ summary: 'List linked wallets' })
  async list(@CurrentUser() _user: AuthUser): Promise<WalletDTO[]> {
    return [];
  }

  @Post('me/wallets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Link wallet (requires fresh initData)' })
  async link(
    @CurrentUser() user: AuthUser,
    @Body() body: { address: string; chain: string; proof: { message: string; signature: string } },
  ): Promise<WalletDTO> {
    try {
      return await this.linkWallet.execute({
        userId: user.id,
        address: body.address,
        chain: body.chain,
        proof: body.proof,
      });
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err) {
        const e = err as Error & { code: string };
        if (e.code === 'INVALID_INPUT' || e.code === 'DUPLICATE_WALLET') {
          throw new HttpException(
            { type: 'https://pred.game/errors/invalid-input', title: e.message, status: 400, code: e.code },
            400,
          );
        }
        if (e.code === 'NOT_FOUND') {
          throw new HttpException(
            { type: 'https://pred.game/errors/not-found', title: e.message, status: 404, code: 'NOT_FOUND' },
            404,
          );
        }
      }
      throw err;
    }
  }

  @Delete('me/wallets/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlink wallet' })
  async unlink(@CurrentUser() _user: AuthUser, @Param('id') _id: string): Promise<void> {}
}
