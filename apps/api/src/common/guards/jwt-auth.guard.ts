import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { AUTH_TOKEN_SERVICE, type IAuthTokenService } from '@pred/application';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(AUTH_TOKEN_SERVICE) private readonly tokenService: IAuthTokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string>;
      user?: { id: string; telegramId: bigint; role: string };
    }>();

    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        type: 'https://pred.game/errors/unauthenticated',
        title: 'Missing or invalid Authorization header',
        status: 401,
        code: 'UNAUTHENTICATED',
      });
    }

    const token = authHeader.slice(7);
    try {
      const payload = await this.tokenService.verifyAccessToken(token);
      request.user = {
        id: payload.sub,
        telegramId: BigInt(payload.tgId),
        role: payload.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException({
        type: 'https://pred.game/errors/unauthenticated',
        title: 'Invalid or expired token',
        status: 401,
        code: 'UNAUTHENTICATED',
      });
    }
  }
}
