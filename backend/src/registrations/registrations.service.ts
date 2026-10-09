import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { isUniqueViolation } from '../common/pg-errors';
import { AuthUser } from '../common/roles';
import { Workshop, WorkshopStatus } from '../workshops/workshop.entity';
import { Registration, RegistrationStatus } from './registration.entity';
import { RegisterAttendeeDto } from './registrations.dto';

const view = (r: Registration) => ({
  id: r.id,
  workshopId: r.workshopId,
  attendeeName: r.attendeeName,
  attendeeEmail: r.attendeeEmail,
  status: r.status,
  registeredAt: r.registeredAt,
  registeredBy: r.registeredBy ? { id: r.registeredBy.id, name: r.registeredBy.name } : null,
  cancelledAt: r.cancelledAt,
  cancelledBy: r.cancelledBy ? { id: r.cancelledBy.id, name: r.cancelledBy.name } : null,
  cancelReason: r.cancelReason,
});

@Injectable()
export class RegistrationsService {
  constructor(@InjectDataSource() private ds: DataSource) {}

  /**
   * THE CAPACITY RULE.
   *
   * Inside one transaction we take a row-level lock on the workshop (SELECT ... FOR UPDATE).
   * Any other registration (or capacity edit) for the SAME workshop blocks on that lock until we
   * commit, so "count active seats -> compare with capacity -> insert" is atomic per workshop.
   * Workshops do not block each other. The check lives in the database transaction, not in
   * application memory, so it also holds with several API instances.
   */
  async register(workshopId: string, dto: RegisterAttendeeDto, actor: AuthUser) {
    const id = await this.ds.transaction(async (m) => {
      const w = await m
        .createQueryBuilder(Workshop, 'w')
        .setLock('pessimistic_write')
        .where('w.id = :id', { id: workshopId })
        .getOne();
      if (!w) throw new NotFoundException('Workshop not found');
      if (w.status !== WorkshopStatus.SCHEDULED) {
        throw new ConflictException(`Registration is closed: this workshop is ${w.status.toLowerCase()}`);
      }
      if (w.startsAt.getTime() + w.durationMinutes * 60_000 < Date.now()) {
        throw new ConflictException('This workshop has already finished');
      }

      const active = await m.count(Registration, { where: { workshopId, status: RegistrationStatus.ACTIVE } });
      if (active >= w.capacity) throw new ConflictException(`This workshop is full (${w.capacity} of ${w.capacity} seats taken)`);

      const dup = await m.exists(Registration, {
        where: { workshopId, attendeeEmail: dto.attendeeEmail, status: RegistrationStatus.ACTIVE },
      });
      if (dup) throw new ConflictException(`${dto.attendeeEmail} is already registered for this workshop`);

      const saved = await m.save(
        Registration,
        m.create(Registration, {
          workshopId,
          attendeeName: dto.attendeeName,
          attendeeEmail: dto.attendeeEmail,
          registeredById: actor.id,
        }),
      );
      return saved.id;
    }).catch((e) => {
      // Backstop: the partial unique index fired (should be unreachable thanks to the lock).
      if (isUniqueViolation(e)) throw new ConflictException(`${dto.attendeeEmail} is already registered for this workshop`);
      throw e;
    });
    return this.getOne(id);
  }

  async cancel(registrationId: string, reason: string | undefined, actor: AuthUser) {
    await this.ds.transaction(async (m) => {
      const r = await m
        .createQueryBuilder(Registration, 'r')
        .setLock('pessimistic_write')
        .where('r.id = :id', { id: registrationId })
        .getOne();
      if (!r) throw new NotFoundException('Registration not found');
      if (r.status === RegistrationStatus.CANCELLED) throw new ConflictException('This registration is already cancelled');
      await m.update(Registration, r.id, {
        status: RegistrationStatus.CANCELLED,
        cancelledById: actor.id,
        cancelledAt: new Date(),
        cancelReason: reason?.trim() || null,
      });
    });
    return this.getOne(registrationId);
  }

  /** Full history for a workshop: active and cancelled, newest first. */
  async listForWorkshop(workshopId: string, status?: RegistrationStatus) {
    if (!(await this.ds.getRepository(Workshop).exists({ where: { id: workshopId } }))) {
      throw new NotFoundException('Workshop not found');
    }
    const rows = await this.ds.getRepository(Registration).find({
      where: { workshopId, ...(status && { status }) },
      relations: { registeredBy: true, cancelledBy: true },
      order: { registeredAt: 'DESC' },
    });
    return rows.map(view);
  }

  private async getOne(id: string) {
    const r = await this.ds.getRepository(Registration).findOneOrFail({
      where: { id },
      relations: { registeredBy: true, cancelledBy: true },
    });
    return view(r);
  }
}
