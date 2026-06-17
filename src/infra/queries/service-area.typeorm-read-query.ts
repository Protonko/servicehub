import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ServiceAreaReadQuery } from '@application/queries/service-area-read.query';
import { ServiceAreaSummary } from '@application/read-models';
import { ServiceAreaEntity } from '@db/entities/service-area.entity';

@Injectable()
export class ServiceAreaTypeOrmReadQuery implements ServiceAreaReadQuery {
  constructor(
    @InjectRepository(ServiceAreaEntity)
    private readonly serviceAreaRepository: Repository<ServiceAreaEntity>,
  ) {}

  async listActiveServiceAreas(): Promise<ServiceAreaSummary[]> {
    return this.serviceAreaRepository
      .createQueryBuilder('serviceArea')
      .select([
        'serviceArea.id AS "id"',
        'serviceArea.code AS "code"',
        'serviceArea.name AS "name"',
        'serviceArea.description AS "description"',
      ])
      .where('serviceArea.is_active = true')
      .orderBy('serviceArea.name', 'ASC')
      .getRawMany<ServiceAreaSummary>();
  }

  async activeServiceAreaExists(serviceAreaId: string): Promise<boolean> {
    return this.serviceAreaRepository.existsBy({ id: serviceAreaId, isActive: true });
  }
}
