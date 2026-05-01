import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { CACHE_PROVIDER, COIN_REPOSITORY, AUTH_TOKEN_SERVICE, type ICacheProvider, type ICoinRepository, type IAuthTokenService } from '@pred/application';

@WebSocketGateway({
  namespace: '/prices',
  cors: { origin: '*' },
})
export class PricesGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  private interval: NodeJS.Timeout | null = null;

  constructor(
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
    @Inject(COIN_REPOSITORY) private readonly coinRepo: ICoinRepository,
  ) {}

  handleConnection(_client: Socket): void {
    // Public namespace — no auth required
  }

  handleDisconnect(): void {
    // Clean up
  }

  onModuleInit(): void {
    this.interval = setInterval(async () => {
      try {
        const coins = await this.coinRepo.findActive();
        for (const coin of coins) {
          const raw = await this.cache.get(`price:${coin.id}:latest`);
          if (!raw) continue;
          const { price, ts } = JSON.parse(raw) as { price: string; ts: number };
          this.broadcastPrice(coin.id, price, '0', ts.toString());
        }
      } catch {
        // skip failed tick
      }
    }, 1000);
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  @SubscribeMessage('subscribe:coin')
  handleSubscribeCoin(client: Socket, payload: { coinId: string }): void {
    void client.join(`coin:${payload.coinId}`);
  }

  @SubscribeMessage('unsubscribe:coin')
  handleUnsubscribeCoin(client: Socket, payload: { coinId: string }): void {
    void client.leave(`coin:${payload.coinId}`);
  }

  broadcastPrice(coinId: string, price: string, change24h: string, ts: string): void {
    this.server.to(`coin:${coinId}`).emit('price:tick', { coinId, price, change24h, ts });
  }
}

@WebSocketGateway({
  namespace: '/user',
  cors: { origin: '*' },
})
export class UserGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(UserGateway.name);

  constructor(
    @Inject(AUTH_TOKEN_SERVICE) private readonly tokenService: IAuthTokenService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      this.logger.warn('No token provided — disconnecting');
      client.disconnect();
      return;
    }

    try {
      const payload = await this.tokenService.verifyAccessToken(token);
      void client.join(`user:${payload.sub}`);
      this.logger.debug(`User ${payload.sub} connected`);
    } catch {
      this.logger.warn('Invalid or expired token — disconnecting');
      client.disconnect();
    }
  }

  broadcastBetPlaced(userId: string, bet: Record<string, unknown>): void {
    this.server.to(`user:${userId}`).emit('bet:placed', bet);
  }

  broadcastBetResolved(userId: string, bet: Record<string, unknown>): void {
    this.server.to(`user:${userId}`).emit('bet:resolved', bet);
  }

  broadcastBalanceChanged(userId: string, balance: string, delta: string, reason: string): void {
    this.server.to(`user:${userId}`).emit('balance:changed', { balance, delta, reason });
  }
}
