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

import { CustomerAddressEntity } from './customer-address.entity';
import { ServiceCategoryEntity } from './service-category.entity';
import { ServiceRequestAttachmentEntity } from './service-request-attachment.entity';
import { ServiceRequestRequiredSkillEntity } from './service-request-required-skill.entity';
import { ServiceTypeEntity } from './service-type.entity';
import { SlaPolicyEntity } from './sla-policy.entity';
import { UserEntity } from './user.entity';

@Entity('service_requests')
export class ServiceRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @Column({ name: 'service_type_id', type: 'uuid' })
  serviceTypeId!: string;

  @Column({ name: 'address_id', type: 'uuid' })
  addressId!: string;

  @Column({ name: 'sla_policy_id', type: 'uuid' })
  slaPolicyId!: string;

  @Column({ type: 'varchar', length: 40 })
  status!: string;

  @Column({ type: 'varchar', length: 20 })
  priority!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'additional_contact_instructions', type: 'text', nullable: true })
  additionalContactInstructions!: string | null;

  @Column({ name: 'preferred_start_at', type: 'timestamptz' })
  preferredStartAt!: Date;

  @Column({ name: 'preferred_end_at', type: 'timestamptz' })
  preferredEndAt!: Date;

  @Column({ name: 'estimated_duration_minutes', type: 'int' })
  estimatedDurationMinutes!: number;

  @Column({ name: 'assignment_deadline_at', type: 'timestamptz' })
  assignmentDeadlineAt!: Date;

  @Column({ name: 'completion_deadline_at', type: 'timestamptz' })
  completionDeadlineAt!: Date;

  @Column({ name: 'triaged_at', type: 'timestamptz', nullable: true })
  triagedAt!: Date | null;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason!: string | null;

  @Column({ name: 'escalated_at', type: 'timestamptz', nullable: true })
  escalatedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer!: UserEntity;

  @ManyToOne(() => ServiceCategoryEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category!: ServiceCategoryEntity;

  @ManyToOne(() => ServiceTypeEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_type_id' })
  serviceType!: ServiceTypeEntity;

  @ManyToOne(() => CustomerAddressEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'address_id' })
  address!: CustomerAddressEntity;

  @ManyToOne(() => SlaPolicyEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sla_policy_id' })
  slaPolicy!: SlaPolicyEntity;

  @OneToMany(() => ServiceRequestRequiredSkillEntity, (requiredSkill) => requiredSkill.request)
  requiredSkills!: ServiceRequestRequiredSkillEntity[];

  @OneToMany(() => ServiceRequestAttachmentEntity, (attachment) => attachment.request)
  attachments!: ServiceRequestAttachmentEntity[];
}
