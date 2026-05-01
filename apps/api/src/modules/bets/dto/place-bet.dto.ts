import { IsString, IsIn, IsInt, Min, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PlaceBetDto {
  @ApiProperty({ example: 'btc' })
  @IsString()
  @IsNotEmpty()
  coinId!: string;

  @ApiProperty({ enum: ['up', 'down'] })
  @IsIn(['up', 'down'])
  direction!: 'up' | 'down';

  @ApiProperty({ example: '100', description: 'Amount in PRED (max 4 decimals)' })
  @IsString()
  @IsNotEmpty()
  amount!: string;

  @ApiProperty({ example: 5, minimum: 2, maximum: 10 })
  @IsInt()
  @Min(2)
  @Max(10)
  multiplier!: number;

  @ApiProperty({ example: 60, description: 'Duration in seconds (30/120/300/3600/14400/86400)' })
  @IsInt()
  @Min(30)
  durationSeconds!: number;
}
