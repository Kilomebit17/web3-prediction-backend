import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { WalletAddress, WalletLinked } from '@pred/domain';
import type { Chain } from '@pred/domain';
import {
  USER_REPOSITORY, EVENT_BUS, CACHE_PROVIDER,
  type IUserRepository, type IEventBus, type ICacheProvider,
} from '../../ports';

export interface LinkWalletInput {
  userId: string;
  address: string;
  chain: string;
  proof: { message: string; signature: string };
}

export interface WalletDTO {
  id: string;
  address: string;
  chain: string;
  isVerified: boolean;
  createdAt: string;
}

@Injectable()
export class LinkWalletUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
  ) {}

  async execute(input: LinkWalletInput): Promise<WalletDTO> {
    // Validate chain
    const validChains: Chain[] = ['ton', 'eth', 'bsc', 'polygon', 'solana'];
    if (!validChains.includes(input.chain as Chain)) {
      throw Object.assign(new Error(`Invalid chain: ${input.chain}`), { code: 'INVALID_INPUT' });
    }

    // Validate address format
    const walletAddress = WalletAddress.of(input.address, input.chain as Chain);

    // Anti-replay: check proof nonce
    const nonceKey = `nonce:${input.address}`;
    const alreadyUsed = await this.cache.exists(nonceKey);
    if (alreadyUsed) {
      throw Object.assign(new Error('Proof already used'), { code: 'INVALID_INPUT' });
    }

    const user = await this.userRepo.findById(input.userId);
    if (!user) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });

    const wallet = {
      id: randomUUID(),
      userId: input.userId,
      address: walletAddress,
      isVerified: true,
      createdAt: new Date(),
    };

    user.linkWallet(wallet);
    await this.userRepo.update(user);

    // Mark nonce as used (5 min TTL)
    await this.cache.set(nonceKey, '1', 300);

    await this.eventBus.publish(
      new WalletLinked(input.userId, input.address, input.chain),
    );

    return {
      id: wallet.id,
      address: wallet.address.address,
      chain: wallet.address.chain,
      isVerified: wallet.isVerified,
      createdAt: wallet.createdAt.toISOString(),
    };
  }
}
