import { IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { ParticipantRole } from '../../entities/wedding-participant.entity';

export class CreateParticipantDto {
  @IsEnum(ParticipantRole)
  role: ParticipantRole;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  primaryName: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  secondaryName?: string | null;
}
