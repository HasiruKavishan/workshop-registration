import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) actorId: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actorId' })
  actor: User;
  @Column({ length: 40 }) action: string;
  @Index() @Column({ length: 20 }) entityType: string; // 'USER' | 'WORKSHOP'
  @Column({ type: 'uuid' }) entityId: string;
  @Column({ type: 'jsonb', default: {} }) details: Record<string, unknown>;
  @Index() @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
