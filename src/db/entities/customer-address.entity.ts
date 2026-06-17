import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ServiceAreaEntity } from './service-area.entity';
import { UserEntity } from './user.entity';

@Entity('customer_addresses')
export class CustomerAddressEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column({ name: 'service_area_id', type: 'uuid' })
  serviceAreaId!: string;

  @Column({ type: 'varchar', length: 240 })
  line1!: string;

  @Column({ type: 'varchar', length: 240, nullable: true })
  line2!: string | null;

  @Column({ type: 'varchar', length: 120 })
  city!: string;

  @Column({ name: 'postal_code', type: 'varchar', length: 40, nullable: true })
  postalCode!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer!: UserEntity;

  @ManyToOne(() => ServiceAreaEntity, (serviceArea) => serviceArea.customerAddresses, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'service_area_id' })
  serviceArea!: ServiceAreaEntity;
}
