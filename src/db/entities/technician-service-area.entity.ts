import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { ServiceAreaEntity } from './service-area.entity';
import { TechnicianEntity } from './technician.entity';

@Entity('technician_service_areas')
export class TechnicianServiceAreaEntity {
  @PrimaryColumn({ name: 'technician_id', type: 'uuid' })
  technicianId!: string;

  @PrimaryColumn({ name: 'service_area_id', type: 'uuid' })
  serviceAreaId!: string;

  @ManyToOne(() => TechnicianEntity, (technician) => technician.serviceAreas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'technician_id' })
  technician!: TechnicianEntity;

  @ManyToOne(() => ServiceAreaEntity, (serviceArea) => serviceArea.technicianServiceAreas, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'service_area_id' })
  serviceArea!: ServiceAreaEntity;
}
