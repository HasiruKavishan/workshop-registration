import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { isUniqueViolation } from '../common/pg-errors';
import { AuthUser } from '../common/roles';
import { Registration, RegistrationStatus } from '../registrations/registration.entity';
import { CreateWorkshopDto, ListWorkshopsQuery, UpdateWorkshopDto } from './workshops.dto';
import { Workshop, WorkshopStatus } from './workshop.entity';

// Seat counts are always derived from ACTIVE registrations - there is no stored counter to drift out of sync.
const SELECT_SQL = `
  SELECT w.*,
         COALESCE(c.active, 0)::int                 AS "activeCount",
         (w.capacity - COALESCE(c.active, 0))::int  AS "availableSeats",
         COUNT(*) OVER()::int                       AS "total"
  FROM workshops w
  LEFT JOIN (
    SELECT "workshopId", COUNT(*) AS active FROM registrations WHERE status = 'ACTIVE' GROUP BY "workshopId"
  ) c ON c."workshopId" = w.id`;

@Injectable()
export class WorkshopsService {
  constructor(@InjectDataSource() private ds: DataSource, private audit: AuditService) {}

  async list(q: ListWorkshopsQuery) {
    const where: string[] = [];
    const params: unknown[] = [];
    const p = (v: unknown) => (params.push(v), `$${params.length}`);

    if (q.from) where.push(`w."startsAt" >= ${p(q.from)}::timestamptz`);
    if (q.to) where.push(`w."startsAt" <= ${p(q.to)}::timestamptz`);
    if (q.status) where.push(`w.status = ${p(q.status)}`);
    if (q.hasSeats) {
      where.push(`w.status = 'SCHEDULED'`);
      where.push(`w.capacity - COALESCE(c.active, 0) > 0`);
    }
    if (q.q?.trim()) {
      const like = p(`%${q.q.trim().replace(/[\\%_]/g, '\\$&')}%`);
      where.push(`(w.code ILIKE ${like} OR w.title ILIKE ${like} OR w.instructor ILIKE ${like})`);
    }

    const pageSize = q.pageSize ?? 20;
    const offset = ((q.page ?? 1) - 1) * pageSize;
    const sql = `${SELECT_SQL} ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                 ORDER BY w."startsAt" ASC, w.code ASC LIMIT ${p(pageSize)} OFFSET ${p(offset)}`;
    const rows: any[] = await this.ds.query(sql, params);
    return { total: rows[0]?.total ?? 0, items: rows.map(({ total, ...w }) => w) };
  }

  async findOne(id: string) {
    const rows: any[] = await this.ds.query(`${SELECT_SQL} WHERE w.id = $1`, [id]);
    if (!rows.length) throw new NotFoundException('Workshop not found');
    const { total, ...w } = rows[0];
    return w;
  }

  async create(dto: CreateWorkshopDto, actor: AuthUser) {
    try {
      const id = await this.ds.transaction(async (m) => {
        const w = await m.save(
          Workshop,
          m.create(Workshop, {
            code: dto.code.toUpperCase(),
            title: dto.title.trim(),
            instructor: dto.instructor.trim(),
            location: dto.location?.trim() || null,
            description: dto.description?.trim() || null,
            startsAt: new Date(dto.startsAt),
            durationMinutes: dto.durationMinutes ?? 60,
            capacity: dto.capacity,
            status: dto.status ?? WorkshopStatus.SCHEDULED,
            createdById: actor.id,
          }),
        );
        await this.audit.record(m, actor.id, 'WORKSHOP_CREATED', 'WORKSHOP', w.id, {
          code: w.code, title: w.title, capacity: w.capacity,
        });
        return w.id;
      });
      return this.findOne(id);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('A workshop with this code already exists');
      throw e;
    }
  }

  async update(id: string, dto: UpdateWorkshopDto, actor: AuthUser) {
    await this.ds.transaction(async (m) => {
      // Same row lock the registration path takes: a capacity change and a registration are serialised.
      const w = await m.createQueryBuilder(Workshop, 'w').setLock('pessimistic_write').where('w.id = :id', { id }).getOne();
      if (!w) throw new NotFoundException('Workshop not found');

      if (dto.capacity !== undefined && dto.capacity < w.capacity) {
        const active = await m.count(Registration, { where: { workshopId: id, status: RegistrationStatus.ACTIVE } });
        if (dto.capacity < active) {
          throw new ConflictException(
            `Cannot reduce capacity to ${dto.capacity}: ${active} seats are already taken. Cancel registrations first.`,
          );
        }
      }

      const next: Partial<Workshop> = {};
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      const set = <K extends keyof Workshop>(k: K, v: Workshop[K] | undefined, cmp: (a: any) => unknown = (a) => a) => {
        if (v === undefined || cmp(v) === cmp(w[k])) return;
        changes[k as string] = { from: w[k], to: v };
        next[k] = v;
      };
      set('title', dto.title?.trim());
      set('instructor', dto.instructor?.trim());
      set('location', dto.location === undefined ? undefined : dto.location.trim() || null);
      set('description', dto.description === undefined ? undefined : dto.description.trim() || null);
      set('startsAt', dto.startsAt ? new Date(dto.startsAt) : undefined, (d) => new Date(d).getTime());
      set('durationMinutes', dto.durationMinutes);
      set('capacity', dto.capacity);
      set('status', dto.status);

      if (Object.keys(changes).length) {
        await m.update(Workshop, id, next);
        await this.audit.record(m, actor.id, changes.status ? 'WORKSHOP_STATUS_CHANGED' : 'WORKSHOP_UPDATED', 'WORKSHOP', id, {
          code: w.code, ...changes,
        });
      }
    });
    return this.findOne(id);
  }
}
