import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { AuthUser, Role } from '../common/roles';
import { RegistrationsService } from '../registrations/registrations.service';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { Workshop, WorkshopStatus } from '../workshops/workshop.entity';
import { WorkshopsService } from '../workshops/workshops.service';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private log = new Logger('Seed');
  constructor(
    private config: ConfigService,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Workshop) private workshopRepo: Repository<Workshop>,
    private usersSvc: UsersService,
    private workshopsSvc: WorkshopsService,
    private regs: RegistrationsService,
  ) {}

  async onApplicationBootstrap() {
    // 1. The first Admin is always seeded (there is no public signup).
    let admin = await this.users.findOne({ where: { role: Role.ADMIN } });
    if (!admin) {
      const email = this.config.get('SEED_ADMIN_EMAIL') ?? 'admin@example.com';
      const password = this.config.get('SEED_ADMIN_PASSWORD') ?? 'Admin123!';
      admin = await this.users.save(
        this.users.create({ email, name: 'Seed Admin', role: Role.ADMIN, passwordHash: await bcrypt.hash(password, 10) }),
      );
      this.log.log(`Seeded admin ${email}`);
    }

    // 2. Optional demo data so reviewers can try the app straight away.
    if (this.config.get('SEED_DEMO') !== 'true') return;
    if ((await this.users.count()) > 1 || (await this.workshopRepo.count()) > 0) return;

    const as = (u: User): AuthUser => ({ id: u.id, email: u.email, name: u.name, role: u.role });
    const manager = await this.usersSvc.create(
      { email: 'manager@example.com', name: 'Mira Manager', role: Role.MANAGER, password: 'Manager123!' }, as(admin));
    const staff = await this.usersSvc.create(
      { email: 'staff@example.com', name: 'Sam Frontdesk', role: Role.STAFF, password: 'Staff123!' }, as(admin));

    const at = (days: number, hour: number) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      d.setHours(hour, 0, 0, 0);
      return d.toISOString();
    };
    const mk = (code: string, title: string, instructor: string, location: string, days: number, hour: number,
                durationMinutes: number, capacity: number, status?: WorkshopStatus) =>
      this.workshopsSvc.create({ code, title, instructor, location, startsAt: at(days, hour), durationMinutes, capacity, status }, as(manager));

    const pot = await mk('POT-101', 'Intro to Pottery', 'Maya Fernando', 'Studio A - North Centre', 1, 10, 120, 12);
    await mk('COD-201', 'Web Basics: HTML & CSS', 'Dev Patel', 'Lab 2 - Central Centre', 2, 14, 180, 20);
    const boot = await mk('FIT-050', 'Saturday Morning Bootcamp', 'Jonas Reid', 'Hall - East Centre', 3, 8, 60, 3);
    const yoga = await mk('FIT-051', 'Beginner Yoga', 'Lena Okafor', 'Hall - East Centre', 3, 18, 60, 1);
    await mk('COD-301', 'SQL for Beginners', 'Dev Patel', 'Lab 2 - Central Centre', 9, 10, 180, 15);
    await mk('POT-102', 'Wheel Throwing', 'Maya Fernando', 'Studio A - North Centre', 5, 13, 150, 8, WorkshopStatus.CANCELLED);

    for (const [name, email] of [['Ana Silva', 'ana@example.com'], ['Ben Cho', 'ben@example.com'], ['Cleo Mann', 'cleo@example.com']]) {
      await this.regs.register(pot.id, { attendeeName: name, attendeeEmail: email }, as(staff));
    }
    for (const [name, email] of [['Dina Roy', 'dina@example.com'], ['Eli Park', 'eli@example.com']]) {
      await this.regs.register(boot.id, { attendeeName: name, attendeeEmail: email }, as(staff));
    }
    const full = await this.regs.register(yoga.id, { attendeeName: 'Fay Zhou', attendeeEmail: 'fay@example.com' }, as(staff));
    const gone = await this.regs.register(pot.id, { attendeeName: 'Gus Lind', attendeeEmail: 'gus@example.com' }, as(staff));
    await this.regs.cancel(gone.id, 'Called to say he cannot make it', as(staff));
    void full;
    this.log.log('Seeded demo manager, staff and sample workshops');
  }
}
