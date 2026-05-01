import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ method: string; url: string; ip: string; headers: Record<string, string>; user?: { id: string } }>();
    const actor = request.user?.id ?? 'anonymous';
    const action = `${request.method} ${request.url}`;

    return next.handle().pipe(
      tap(() => {
        // Phase 4.2: Write to audit_log table
        void actor; void action;
      }),
    );
  }
}
