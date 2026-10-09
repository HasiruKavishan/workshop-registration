import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Role } from '../common/roles';
import { AuditLog } from './audit-log.entity';

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private repo: Repository<AuditLog>) {}

  /** Pass the transaction's EntityManager so the audit row commits/rolls back with the change itself. */
  async record(
    manager: EntityManager | undefined,
    actorId: string,
    action: string,
    entityType: 'USER' | 'WORKSHOP',
    entityId: string,
    details: Record<string, unknown> = {},
  ) {
    await (manager ?? this.repo.manager).insert(AuditLog, { actorId, action, entityType, entityId, details: details as any });
  }

  /** Admins see account/role changes; Managers see workshop changes (mirrors the permission table). */
  async list(role: Role, page = 1, pageSize = 50) {
    const entityType = role === Role.ADMIN ? 'USER' : 'WORKSHOP';
    const [rows, total] = await this.repo.findAndCount({
      where: { entityType },
      relations: { actor: true },
      order: { createdAt: 'DESC' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });
    return {
      total,
      items: rows.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        details: r.details,
        createdAt: r.createdAt,
        actor: { id: r.actor.id, name: r.actor.name, email: r.actor.email },
      })),
    };
  }
}
