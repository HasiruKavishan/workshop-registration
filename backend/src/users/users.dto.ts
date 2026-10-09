import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '../common/roles';

export class CreateUserDto {
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsEnum(Role) role: Role;
  @IsString() @MinLength(8) @MaxLength(72) password: string;
}

export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['email'] as const)) {
  @IsOptional() @IsBoolean() isActive?: boolean;
}
