import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from '../common/roles';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) email: string;
  @Column() name: string;
  /** select:false -> never loaded (or serialised) unless explicitly requested by the login query. */
  @Column({ select: false }) passwordHash: string;
  @Column({ type: 'varchar', length: 16 }) role: Role;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt: Date;
}
