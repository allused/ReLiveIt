import { IsISO8601, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTimelineEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title: string;

  @IsISO8601()
  occursAt: string;
}
