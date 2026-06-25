import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { TechnicianEntity } from './technician.entity';

@Entity('technician_availability_windows')
export class TechnicianAvailabilityWindowEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'technician_id', type: 'uuid' })
  technicianId!: string;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @Column({ name: 'is_available', type: 'boolean' })
  isAvailable!: boolean;

  @Column({ type: 'varchar', length: 160, nullable: true })
  reason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => TechnicianEntity, (technician) => technician.availabilityWindows, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'technician_id' })
  technician!: TechnicianEntity;
}
