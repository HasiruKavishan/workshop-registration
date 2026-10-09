import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { RegistrationStatus } from './registration.entity';

export class RegisterAttendeeDto {
  @IsString() @IsNotEmpty() @MaxLength(100) @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  attendeeName: string;

  @IsEmail() @MaxLength(200) @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  attendeeEmail: string;
}

export class CancelRegistrationDto {
  @IsOptional() @IsString() @MaxLength(300) reason?: string;
}

export class ListRegistrationsQuery {
  @IsOptional() @IsEnum(RegistrationStatus) status?: RegistrationStatus;
}
