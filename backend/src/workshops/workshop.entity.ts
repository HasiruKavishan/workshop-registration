import { Check, Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export enum WorkshopStatus {
  SCHEDULED = 'SCHEDULED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

@Entity('workshops')
@Check('"capacity" > 0')
export class Workshop {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true, length: 20 }) code: string;
  @Column() title: string;
  @Column() instructor: string;
  @Column({ type: 'varchar', nullable: true }) location: string | null;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Index() @Column({ type: 'timestamptz' }) startsAt: Date;
  @Column({ type: 'int', default: 60 }) durationMinutes: number;
  @Column({ type: 'int' }) capacity: number;
  @Index() @Column({ type: 'varchar', length: 16, default: WorkshopStatus.SCHEDULED }) status: WorkshopStatus;
  @Column({ type: 'uuid', nullable: true }) createdById: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt: Date;
}
