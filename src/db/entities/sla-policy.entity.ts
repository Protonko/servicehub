import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ServiceTypeEntity } from './service-type.entity';

@Entity('sla_policies')
export class SlaPolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  priority!: string;

  @Column({ name: 'assignment_deadline_minutes', type: 'int' })
  assignmentDeadlineMinutes!: number;

  @Column({ name: 'completion_deadline_minutes', type: 'int' })
  completionDeadlineMinutes!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ServiceTypeEntity, (serviceType) => serviceType.slaPolicy)
  serviceTypes!: ServiceTypeEntity[];
}
