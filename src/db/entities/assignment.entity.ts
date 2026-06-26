import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { AssignmentStatus } from '@domain/model';
import { ServiceRequestEntity } from './service-request.entity';
import { TechnicianEntity } from './technician.entity';
import { UserEntity } from './user.entity';

@Entity('assignments')
export class AssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'service_request_id', type: 'uuid' })
  serviceRequestId!: string;

  @Column({ name: 'technician_id', type: 'uuid' })
  technicianId!: string;

  @Column({ name: 'assigned_by_user_id', type: 'uuid' })
  assignedByUserId!: string;

  @Column({ type: 'enum', enum: AssignmentStatus, enumName: 'assignment_status' })
  status!: AssignmentStatus;

  @Column({ name: 'starts_at', type: 'timestamptz' })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz' })
  endsAt!: Date;

  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
  acceptedAt!: Date | null;

  @Column({ name: 'on_the_way_at', type: 'timestamptz', nullable: true })
  onTheWayAt!: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => ServiceRequestEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'service_request_id' })
  serviceRequest!: ServiceRequestEntity;

  @ManyToOne(() => TechnicianEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'technician_id' })
  technician!: TechnicianEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assigned_by_user_id' })
  assignedByUser!: UserEntity;
}
