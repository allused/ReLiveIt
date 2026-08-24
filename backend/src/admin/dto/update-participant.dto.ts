import { IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { ParticipantStatus } from '../../entities/wedding-participant.entity';

export class UpdateParticipantDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  primaryName?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsString()
  @MaxLength(80)
  secondaryName?: string | null;

  @IsOptional()
  @IsEnum(ParticipantStatus)
  status?: ParticipantStatus;
}
