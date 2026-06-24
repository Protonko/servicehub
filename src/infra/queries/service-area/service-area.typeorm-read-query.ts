import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { ServiceAreaReadQuery } from '@application/queries/service-area-read.query';
import { ServiceAreaSummary } from '@application/read-models';
import { ServiceAreaEntity } from '@db/entities/service-area.entity';

import { ServiceAreaReadMapper } from './service-area-read.mapper';
import { ServiceAreaRow } from './service-area-read.types';

@Injectable()
export class ServiceAreaTypeOrmReadQuery implements ServiceAreaReadQuery {
  constructor(
    @InjectRepository(ServiceAreaEntity)
    private readonly serviceAreaRepository: Repository<ServiceAreaEntity>,
  ) {}

  async listActiveServiceAreas(): Promise<ServiceAreaSummary[]> {
    const rows = await this.serviceAreaRepository
      .createQueryBuilder('serviceArea')
      .select([
        'serviceArea.id AS "id"',
        'serviceArea.code AS "code"',
        'serviceArea.name AS "name"',
        'serviceArea.description AS "description"',
      ])
      .where('serviceArea.is_active = true')
      .orderBy('serviceArea.name', 'ASC')
      .getRawMany<ServiceAreaRow>();

    return rows.map((row) => ServiceAreaReadMapper.toSummary(row));
  }

  async activeServiceAreaExists(serviceAreaId: string): Promise<boolean> {
    return this.serviceAreaRepository.existsBy({ id: serviceAreaId, isActive: true });
  }

  async findActiveServiceAreaIds(serviceAreaIds: string[]): Promise<string[]> {
    if (serviceAreaIds.length === 0) {
      return [];
    }

    const serviceAreas = await this.serviceAreaRepository.find({
      select: { id: true },
      where: { id: In(serviceAreaIds), isActive: true },
    });

    return serviceAreas.map((serviceArea) => serviceArea.id);
  }
}
