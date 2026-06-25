import { TechnicianAvailabilityWindowEntity } from '@db/entities/technician-availability-window.entity';
import { TechnicianAvailabilityWindow } from '@domain/model';

export class TechnicianAvailabilityMapper {
  static toDomain(entity: TechnicianAvailabilityWindowEntity): TechnicianAvailabilityWindow {
    return TechnicianAvailabilityWindow.rehydrate({
      id: entity.id,
      technicianId: entity.technicianId,
      startsAt: entity.startsAt,
      endsAt: entity.endsAt,
      isAvailable: entity.isAvailable,
      reason: entity.reason,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(window: TechnicianAvailabilityWindow): TechnicianAvailabilityWindowEntity {
    const entity = new TechnicianAvailabilityWindowEntity();

    entity.id = window.id;
    entity.technicianId = window.technicianId;
    entity.startsAt = window.startsAt;
    entity.endsAt = window.endsAt;
    entity.isAvailable = window.isAvailable;
    entity.reason = window.reason;

    return entity;
  }
}
