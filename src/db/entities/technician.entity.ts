import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { TechnicianStatus } from '@domain/model';
import { TechnicianServiceAreaEntity } from './technician-service-area.entity';
import { TechnicianSkillEntity } from './technician-skill.entity';
import { TechnicianAvailabilityWindowEntity } from './technician-availability-window.entity';
import { UserEntity } from './user.entity';

@Entity('technicians')
export class TechnicianEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @Column({
    type: 'enum',
    enum: TechnicianStatus,
    enumName: 'technician_status',
    default: TechnicianStatus.Active,
  })
  status!: TechnicianStatus;

  @Column({ name: 'daily_assignment_limit', type: 'integer' })
  dailyAssignmentLimit!: number;

  @Column({ type: 'numeric', precision: 3, scale: 2, nullable: true })
  rating!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne(() => UserEntity, (user) => user.technicianProfile, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @OneToMany(() => TechnicianSkillEntity, (technicianSkill) => technicianSkill.technician)
  skills!: TechnicianSkillEntity[];

  @OneToMany(
    () => TechnicianServiceAreaEntity,
    (technicianServiceArea) => technicianServiceArea.technician,
  )
  serviceAreas!: TechnicianServiceAreaEntity[];

  @OneToMany(
    () => TechnicianAvailabilityWindowEntity,
    (availabilityWindow) => availabilityWindow.technician,
  )
  availabilityWindows!: TechnicianAvailabilityWindowEntity[];
}
