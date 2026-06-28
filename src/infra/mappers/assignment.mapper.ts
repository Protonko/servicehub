import { AssignmentEntity } from '@db/entities/assignment.entity';
import { Assignment } from '@domain/model';

export class AssignmentMapper {
  static toEntity(assignment: Assignment): AssignmentEntity {
    const entity = new AssignmentEntity();

    entity.id = assignment.id;
    entity.serviceRequestId = assignment.serviceRequestId;
    entity.technicianId = assignment.technicianId;
    entity.assignedByUserId = assignment.assignedByUserId;
    entity.status = assignment.status;
    entity.startsAt = assignment.startsAt;
    entity.endsAt = assignment.endsAt;
    entity.acceptedAt = assignment.acceptedAt;
    entity.onTheWayAt = assignment.onTheWayAt;
    entity.startedAt = assignment.startedAt;
    entity.completedAt = assignment.completedAt;
    entity.cancelledAt = assignment.cancelledAt;
    entity.cancellationReason = assignment.cancellationReason;

    return entity;
  }

  static toDomain(entity: AssignmentEntity): Assignment {
    return Assignment.rehydrate({
      id: entity.id,
      serviceRequestId: entity.serviceRequestId,
      technicianId: entity.technicianId,
      assignedByUserId: entity.assignedByUserId,
      status: entity.status,
      startsAt: entity.startsAt,
      endsAt: entity.endsAt,
      acceptedAt: entity.acceptedAt,
      onTheWayAt: entity.onTheWayAt,
      startedAt: entity.startedAt,
      completedAt: entity.completedAt,
      cancelledAt: entity.cancelledAt,
      cancellationReason: entity.cancellationReason,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }
}
