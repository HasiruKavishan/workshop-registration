import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegistrationsModule } from '../registrations/registrations.module';
import { User } from '../users/user.entity';
import { UsersModule } from '../users/users.module';
import { Workshop } from '../workshops/workshop.entity';
import { WorkshopsModule } from '../workshops/workshops.module';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Workshop]), UsersModule, WorkshopsModule, RegistrationsModule],
  providers: [SeedService],
})
export class SeedModule {}
