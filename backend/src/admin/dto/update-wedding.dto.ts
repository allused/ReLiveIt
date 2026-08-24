import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { MAX_QUICK_VOTE_COUNT, MIN_QUICK_VOTE_COUNT } from '../../common/constants';

export class UpdateWeddingDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsBoolean()
  quickVoteEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_QUICK_VOTE_COUNT)
  @Max(MAX_QUICK_VOTE_COUNT)
  quickVotePhotoCount?: number;
}
