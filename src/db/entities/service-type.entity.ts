import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ServiceCategoryEntity } from './service-category.entity';
import { ServiceTypeRequiredSkillEntity } from './service-type-required-skill.entity';
import { SlaPolicyEntity } from './sla-policy.entity';

@Entity('service_types')
export class ServiceTypeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @Column({ name: 'sla_policy_id', type: 'uuid' })
  slaPolicyId!: string;

  @Column({ type: 'varchar', length: 100 })
  code!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'default_priority', type: 'varchar', length: 20 })
  defaultPriority!: string;

  @Column({ name: 'estimated_duration_minutes', type: 'int' })
  estimatedDurationMinutes!: number;

  @Column({ name: 'is_other', type: 'boolean', default: false })
  isOther!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => ServiceCategoryEntity, (category) => category.serviceTypes, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'category_id' })
  category!: ServiceCategoryEntity;

  @ManyToOne(() => SlaPolicyEntity, (slaPolicy) => slaPolicy.serviceTypes, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'sla_policy_id' })
  slaPolicy!: SlaPolicyEntity;

  @OneToMany(() => ServiceTypeRequiredSkillEntity, (requiredSkill) => requiredSkill.serviceType)
  requiredSkills!: ServiceTypeRequiredSkillEntity[];
}
