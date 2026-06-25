import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TechnicianCalendarReadQuery } from '@application/queries/technician-calendar-read.query';
import { TechnicianCalendarAvailabilityWindow } from '@application/read-models';
import { TechnicianAvailabilityWindowEntity } from '@db/entities/technician-availability-window.entity';

@Injectable()
export class TechnicianCalendarTypeOrmReadQuery implements TechnicianCalendarReadQuery {
  constructor(
    @InjectRepository(TechnicianAvailabilityWindowEntity)
    private readonly repository: Repository<TechnicianAvailabilityWindowEntity>,
  ) {}

  async listAvailabilityWindows(
    technicianId: string,
  ): Promise<TechnicianCalendarAvailabilityWindow[]> {
    const windows = await this.repository.find({
      where: { technicianId },
      order: { startsAt: 'ASC', endsAt: 'ASC', id: 'ASC' },
    });

    return windows.map((window) => ({
      id: window.id,
      technicianId: window.technicianId,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      isAvailable: window.isAvailable,
      reason: window.reason,
      createdAt: window.createdAt,
      updatedAt: window.updatedAt,
    }));
  }
}
