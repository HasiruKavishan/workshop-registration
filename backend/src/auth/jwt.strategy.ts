import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { AuthUser } from '../common/roles';
import { User } from '../users/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, @InjectRepository(User) private users: Repository<User>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  /**
   * The role is re-read from the database on every request, so a demotion or
   * deactivation takes effect immediately instead of when the token expires.
   */
  async validate(payload: { sub: string }): Promise<AuthUser> {
    const u = await this.users.findOne({ where: { id: payload.sub } });
    if (!u || !u.isActive) throw new UnauthorizedException();
    return { id: u.id, email: u.email, name: u.name, role: u.role };
  }
}
