import { Technician } from '@domain/model';
import { TechnicianEntity } from '@db/entities/technician.entity';

export class TechnicianMapper {
  static toDomain(entity: TechnicianEntity): Technician {
    return Technician.rehydrate({
      id: entity.id,
      userId: entity.userId,
      status: entity.status,
      dailyAssignmentLimit: entity.dailyAssignmentLimit,
      rating: entity.rating === null ? null : Number(entity.rating),
      skillIds: (entity.skills ?? []).map((link) => link.skillId),
      serviceAreaIds: (entity.serviceAreas ?? []).map((link) => link.serviceAreaId),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  static toEntity(technician: Technician): TechnicianEntity {
    const entity = new TechnicianEntity();

    entity.id = technician.id;
    entity.userId = technician.userId;
    entity.status = technician.status;
    entity.dailyAssignmentLimit = technician.dailyAssignmentLimit;
    entity.rating = technician.rating === null ? null : technician.rating.toFixed(2);

    return entity;
  }
}
