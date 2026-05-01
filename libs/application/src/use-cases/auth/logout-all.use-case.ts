import { Injectable, Inject } from '@nestjs/common';
import {
  AUTH_TOKEN_SERVICE,
  type IAuthTokenService,
} from '../../ports';

export interface LogoutAllInput {
  userId: string;
}

@Injectable()
export class LogoutAllUseCase {
  constructor(
    @Inject(AUTH_TOKEN_SERVICE) private readonly tokenService: IAuthTokenService,
  ) {}

  async execute(input: LogoutAllInput): Promise<void> {
    await this.tokenService.logoutAll(input.userId);
  }
}
