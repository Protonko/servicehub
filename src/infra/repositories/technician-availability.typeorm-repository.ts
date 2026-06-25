import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { TechnicianAvailabilityWindowEntity } from '@db/entities/technician-availability-window.entity';
import { TechnicianEntity } from '@db/entities/technician.entity';
import { TechnicianAvailabilityWindow } from '@domain/model';
import { TechnicianAvailabilityRepository } from '@domain/repositories';

import { TechnicianAvailabilityMapper } from '../mappers/technician-availability.mapper';

@Injectable()
export class TechnicianAvailabilityTypeOrmRepository implements TechnicianAvailabilityRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async save(window: TechnicianAvailabilityWindow): Promise<TechnicianAvailabilityWindow> {
    return this.dataSource.transaction(async (manager) => {
      await manager.findOneOrFail(TechnicianEntity, {
        where: { id: window.technicianId },
        lock: { mode: 'pessimistic_write' },
      });
      const saved = await manager.save(
        TechnicianAvailabilityWindowEntity,
        TechnicianAvailabilityMapper.toEntity(window),
      );

      return TechnicianAvailabilityMapper.toDomain(saved);
    });
  }
}
