import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<{ user?: { role: string } }>();
    if (!request.user) {
      throw new ForbiddenException({
        type: 'https://pred.game/errors/forbidden',
        title: 'Access denied',
        status: 403,
        code: 'FORBIDDEN',
      });
    }
    const hasRole = requiredRoles.includes(request.user.role);
    if (!hasRole) {
      throw new ForbiddenException({
        type: 'https://pred.game/errors/forbidden',
        title: 'Insufficient permissions',
        status: 403,
        code: 'FORBIDDEN',
      });
    }
    return true;
  }
}
