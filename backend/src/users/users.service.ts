import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { DataSource, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { isUniqueViolation } from '../common/pg-errors';
import { AuthUser, Role } from '../common/roles';
import { CreateUserDto, UpdateUserDto } from './users.dto';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private repo: Repository<User>,
    @InjectDataSource() private ds: DataSource,
    private audit: AuditService,
  ) {}

  list() {
    return this.repo.find({ order: { createdAt: 'ASC' } });
  }

  async create(dto: CreateUserDto, actor: AuthUser) {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      return await this.ds.transaction(async (m) => {
        const { id } = await m.save(User, m.create(User, { email, name: dto.name.trim(), role: dto.role, passwordHash }));
        await this.audit.record(m, actor.id, 'USER_CREATED', 'USER', id, { email, role: dto.role });
        return m.findOneByOrFail(User, { id });
      });
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException('A user with this email already exists');
      throw e;
    }
  }

  async update(id: string, dto: UpdateUserDto, actor: AuthUser) {
    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;
    return this.ds.transaction(async (m) => {
      // Lock every active admin row so two concurrent demotions cannot leave the system with no admin.
      const admins = await m
        .createQueryBuilder(User, 'u')
        .setLock('pessimistic_write')
        .where('u.role = :r AND u.isActive = true', { r: Role.ADMIN })
        .getMany();
      const user = await m.findOne(User, { where: { id } });
      if (!user) throw new NotFoundException('User not found');

      const newRole = dto.role ?? user.role;
      const newActive = dto.isActive ?? user.isActive;
      const wasActiveAdmin = user.role === Role.ADMIN && user.isActive;
      if (wasActiveAdmin && (newRole !== Role.ADMIN || !newActive) && admins.filter((a) => a.id !== id).length === 0) {
        throw new ConflictException('There must always be at least one active Admin');
      }

      const changes: Record<string, unknown> = {};
      if (dto.name !== undefined && dto.name.trim() !== user.name) changes.name = { from: user.name, to: dto.name.trim() };
      if (newRole !== user.role) changes.role = { from: user.role, to: newRole };
      if (newActive !== user.isActive) changes.isActive = { from: user.isActive, to: newActive };
      if (passwordHash) changes.passwordReset = true;

      await m.update(User, id, {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        role: newRole,
        isActive: newActive,
        ...(passwordHash && { passwordHash }),
      });
      if (Object.keys(changes).length) {
        await this.audit.record(m, actor.id, changes.role ? 'USER_ROLE_CHANGED' : 'USER_UPDATED', 'USER', id, {
          email: user.email,
          ...changes,
        });
      }
      return m.findOneByOrFail(User, { id });
    });
  }
}
