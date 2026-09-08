import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTimelineEventDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsISO8601()
  occursAt?: string;
}
