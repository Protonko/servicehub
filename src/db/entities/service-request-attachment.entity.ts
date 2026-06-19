import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ServiceRequestEntity } from './service-request.entity';
import { UserEntity } from './user.entity';

@Entity('service_request_attachments')
export class ServiceRequestAttachmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'service_request_id', type: 'uuid' })
  serviceRequestId!: string;

  @Column({ name: 'uploaded_by_user_id', type: 'uuid' })
  uploadedByUserId!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 240 })
  fileName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 120 })
  mimeType!: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 500 })
  storageKey!: string;

  @Column({ type: 'varchar', length: 60 })
  kind!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => ServiceRequestEntity, (request) => request.attachments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_request_id' })
  request!: ServiceRequestEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedBy!: UserEntity;
}
