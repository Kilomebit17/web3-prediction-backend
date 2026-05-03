import { Injectable, Inject } from '@nestjs/common';
import { Money, UserBalanceChanged } from '@pred/domain';
import {
  USER_REPOSITORY, TRANSACTION_REPOSITORY, EVENT_BUS,
  type IUserRepository, type ITransactionRepository, type IEventBus,
} from '../../ports';
import { DEPOSIT_REPO, FIRST_DEPOSIT_BONUS_PERCENT } from './create-payment-intent.use-case';

export interface ProcessDepositCompletionInput {
  intentId: string;
  providerIntentId: string;
}

export interface DepositCompletionResult {
  id: string;
  userId: string;
  predAmount: string;
  isFirstDeposit: boolean;
  firstDepositBonusPercent: number;
}

/** Multiplier for first-deposit bonus: 1.0 = 100%, 2.0 = 200% */
const FIRST_DEPOSIT_MULTIPLIER = FIRST_DEPOSIT_BONUS_PERCENT / 100;

interface IDepositRepo {
  findIntentById(id: string): Promise<{
    id: string; userId: string; packageId: string;
    status: string; predAmount: string;
  } | null>;
  findPackageById(id: string): Promise<{
    amount: string; bonusAmount: string;
  } | null>;
  countCompletedDepositsByUserId(userId: string): Promise<number>;
  completeIntent(id: string, providerIntentId: string, finalPredAmount?: number): Promise<void>;
}

@Injectable()
export class ProcessDepositCompletionUseCase {
  constructor(
    @Inject(DEPOSIT_REPO) private readonly depositRepo: IDepositRepo,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
    @Inject(TRANSACTION_REPOSITORY) private readonly txRepo: ITransactionRepository,
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
  ) {}

  async execute(input: ProcessDepositCompletionInput): Promise<DepositCompletionResult> {
    const intent = await this.depositRepo.findIntentById(input.intentId);
    if (!intent) throw Object.assign(new Error('Payment intent not found'), { code: 'NOT_FOUND' });
    if (intent.status === 'completed') {
      return {
        id: intent.id, userId: intent.userId,
        predAmount: intent.predAmount,
        isFirstDeposit: false, firstDepositBonusPercent: 0,
      };
    }

    const pkg = await this.depositRepo.findPackageById(intent.packageId);
    if (!pkg) throw Object.assign(new Error('Deposit package not found'), { code: 'NOT_FOUND' });

    const baseAmount = parseFloat(pkg.amount);
    const predAmount = parseFloat(intent.predAmount); // base + package bonus

    const completedCount = await this.depositRepo.countCompletedDepositsByUserId(intent.userId);
    const isFirstDeposit = completedCount === 0;
    const firstDepositBonus = isFirstDeposit ? baseAmount * FIRST_DEPOSIT_MULTIPLIER : 0;
    const totalPredAmount = predAmount + firstDepositBonus;

    await this.depositRepo.completeIntent(intent.id, input.providerIntentId, totalPredAmount);

    const user = await this.userRepo.findById(intent.userId);
    if (!user) throw Object.assign(new Error('User not found'), { code: 'NOT_FOUND' });

    const creditAmount = Money.fromPred(totalPredAmount);
    const tx = user.credit(creditAmount, 'deposit', {
      referenceType: 'deposit',
      referenceId: intent.id,
    });
    await this.txRepo.create(tx);
    await this.userRepo.update(user);

    await this.eventBus.publish(
      new UserBalanceChanged(intent.userId, creditAmount.toString(), 'deposit'),
    );

    return {
      id: intent.id,
      userId: intent.userId,
      predAmount: totalPredAmount.toFixed(4),
      isFirstDeposit,
      firstDepositBonusPercent: isFirstDeposit ? FIRST_DEPOSIT_BONUS_PERCENT : 0,
    };
  }
}
