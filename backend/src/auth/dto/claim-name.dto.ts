import { IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class ClaimNameDto {
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
