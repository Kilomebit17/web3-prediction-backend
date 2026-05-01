import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    description: 'Display username (3-32 chars, alphanumeric + underscore)',
    example: 'pred_master',
  })
  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,32}$/)
  username!: string;
}
