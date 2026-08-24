import { Type } from 'class-transformer';
import { IsIn } from 'class-validator';

export class CreateVoteDto {
  @Type(() => Number)
  @IsIn([0, 1])
  value: 0 | 1;
}
