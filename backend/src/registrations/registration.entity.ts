import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Workshop } from '../workshops/workshop.entity';

export enum RegistrationStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
}

/**
 * Registrations are never deleted: cancelling flips status and records who/when.
 * The partial unique index stops the same email holding two ACTIVE seats in one workshop,
 * while still allowing re-registration after a cancellation (new row, old row kept as history).
 */
@Entity('registrations')
@Index('uq_registration_active_email', ['workshopId', 'attendeeEmail'], {
  unique: true,
  where: `"status" = 'ACTIVE'`,
})
@Index('ix_registration_workshop_status', ['workshopId', 'status'])
export class Registration {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'uuid' }) workshopId: string;
  @ManyToOne(() => Workshop, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'workshopId' })
  workshop: Workshop;

  @Column() attendeeName: string;
  @Column() attendeeEmail: string;
  @Column({ type: 'varchar', length: 16, default: RegistrationStatus.ACTIVE }) status: RegistrationStatus;

  @Column({ type: 'uuid' }) registeredById: string;
  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'registeredById' })
  registeredBy: User;
  @CreateDateColumn({ type: 'timestamptz' }) registeredAt: Date;

  @Column({ type: 'uuid', nullable: true }) cancelledById: string | null;
  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'cancelledById' })
  cancelledBy: User | null;
  @Column({ type: 'timestamptz', nullable: true }) cancelledAt: Date | null;
  @Column({ type: 'varchar', nullable: true }) cancelReason: string | null;
}
