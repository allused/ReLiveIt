import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { MAX_GUEST_BATCH } from '../../common/constants';
import { ParticipantRole } from '../../entities/wedding-participant.entity';

export class CreateParticipantDto {
  @IsEnum(ParticipantRole)
  role: ParticipantRole;

  @ValidateIf(
    (dto: CreateParticipantDto) =>
      dto.role === ParticipantRole.REVIEWER || Boolean(dto.primaryName),
  )
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  primaryName?: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== undefined && value !== '')
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  secondaryName?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_GUEST_BATCH)
  count?: number;
}
