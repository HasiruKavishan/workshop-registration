import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { IsEmail, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../common/current-user.decorator';
import { ALL_ROLES, AuthUser, Public, Roles } from '../common/roles';
import { AuthService } from './auth.service';

class LoginDto {
  @IsEmail() email: string;
  @IsString() @MaxLength(72) password: string;
}

@Controller()
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Public()
  @Post('auth/login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Get('auth/me')
  @Roles(...ALL_ROLES)
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
