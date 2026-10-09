import { OmitType, PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsEnum, IsISO8601, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min,
} from 'class-validator';
import { WorkshopStatus } from './workshop.entity';

export class CreateWorkshopDto {
  @Matches(/^[A-Za-z0-9_-]{2,20}$/, { message: 'code must be 2-20 letters, digits, - or _' }) code: string;
  @IsString() @IsNotEmpty() @MaxLength(150) title: string;
  @IsString() @IsNotEmpty() @MaxLength(100) instructor: string;
  @IsOptional() @IsString() @MaxLength(150) location?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsISO8601() startsAt: string;
  @IsOptional() @IsInt() @Min(15) @Max(1440) durationMinutes?: number;
  @IsInt() @Min(1) @Max(1000) capacity: number;
  @IsOptional() @IsEnum(WorkshopStatus) status?: WorkshopStatus;
}

/** The code is the workshop's identity and cannot be edited afterwards. */
export class UpdateWorkshopDto extends PartialType(OmitType(CreateWorkshopDto, ['code'] as const)) {}

export class ListWorkshopsQuery {
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
  @IsOptional() @IsEnum(WorkshopStatus) status?: WorkshopStatus;
  /** When true: only SCHEDULED workshops with at least one free seat. */
  @IsOptional() @Transform(({ value }) => value === true || value === 'true') @IsBoolean() hasSeats?: boolean;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
}
