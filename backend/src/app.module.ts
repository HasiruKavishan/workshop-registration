import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit/audit-log.entity';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard, RolesGuard } from './common/guards';
import { Registration } from './registrations/registration.entity';
import { RegistrationsModule } from './registrations/registrations.module';
import { SeedModule } from './seed/seed.module';
import { User } from './users/user.entity';
import { UsersModule } from './users/users.module';
import { Workshop } from './workshops/workshop.entity';
import { WorkshopsModule } from './workshops/workshops.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({
        type: 'postgres' as const,
        host: c.get<string>('DB_HOST') ?? 'localhost',
        port: Number(c.get('DB_PORT') ?? 5432),
        username: c.get<string>('DB_USER') ?? 'workshop',
        password: c.get<string>('DB_PASSWORD') ?? 'workshop',
        database: c.get<string>('DB_NAME') ?? 'workshop',
        entities: [User, Workshop, Registration, AuditLog],
        // Auto-sync keeps the challenge setup to one command. A real deployment would use migrations.
        synchronize: c.get('DB_SYNCHRONIZE') !== 'false',
        retryAttempts: 10,
        retryDelay: 2000,
        extra: { max: 20 },
      }),
    }),
    AuditModule, AuthModule, UsersModule, WorkshopsModule, RegistrationsModule, SeedModule,
  ],
  providers: [
    // Order matters: authenticate first, then authorise.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
