import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { AssignmentEntity } from '@db/entities/assignment.entity';
import { AuditLogEntity } from '@db/entities/audit-log.entity';
import { CustomerAddressEntity } from '@db/entities/customer-address.entity';
import { OutboxEventEntity } from '@db/entities/outbox-event.entity';
import { ServiceRequestRequiredSkillEntity } from '@db/entities/service-request-required-skill.entity';
import { ServiceRequestEntity } from '@db/entities/service-request.entity';
import { TechnicianAvailabilityWindowEntity } from '@db/entities/technician-availability-window.entity';
import { TechnicianServiceAreaEntity } from '@db/entities/technician-service-area.entity';
import { TechnicianSkillEntity } from '@db/entities/technician-skill.entity';
import { TechnicianEntity } from '@db/entities/technician.entity';
import { ACTIVE_ASSIGNMENT_STATUSES, AssignmentTimeSlot } from '@domain/model';
import {
  AssignedTechnician,
  AssignmentRepository,
  AssignmentRequestSnapshot,
  AssignmentTechnicianSnapshot,
  AssignmentTransactionContext,
  AssignmentTransactionLookup,
  SaveAssignmentOutcomeInput,
} from '@domain/repositories';

import { AssignmentMapper } from '../mappers/assignment.mapper';
import { ServiceRequestMapper } from '../mappers/service-request.mapper';
import { TechnicianAvailabilityMapper } from '../mappers/technician-availability.mapper';
import { TechnicianMapper } from '../mappers/technician.mapper';

const TECHNICIAN_ASSIGNED = 'TechnicianAssigned';
const SERVICE_REQUEST_AGGREGATE = 'service_request';

class TypeOrmAssignmentTransactionContext implements AssignmentTransactionContext {
  constructor(
    private readonly manager: EntityManager,
    private readonly lockedRequest: ServiceRequestEntity | null,
    readonly requestSnapshot: AssignmentRequestSnapshot | null,
    readonly technicianSnapshot: AssignmentTechnicianSnapshot | null,
  ) {}

  async hasActiveOverlap(technicianId: string, slot: AssignmentTimeSlot): Promise<boolean> {
    return this.manager
      .getRepository(AssignmentEntity)
      .createQueryBuilder('assignment')
      .where('assignment.technician_id = :technicianId', { technicianId })
      .andWhere('assignment.status IN (:...activeStatuses)', {
        activeStatuses: [...ACTIVE_ASSIGNMENT_STATUSES],
      })
      .andWhere('assignment.starts_at < :endsAt', { endsAt: slot.endsAt })
      .andWhere('assignment.ends_at > :startsAt', { startsAt: slot.startsAt })
      .getExists();
  }

  async saveAssignmentOutcome(input: SaveAssignmentOutcomeInput): Promise<AssignedTechnician> {
    if (!this.lockedRequest || this.lockedRequest.id !== input.request.id) {
      throw new Error('Assignment transaction request does not match the locked request');
    }

    if (
      !this.technicianSnapshot ||
      this.technicianSnapshot.technician.id !== input.assignment.technicianId
    ) {
      throw new Error('Assignment transaction technician does not match the locked technician');
    }

    if (input.assignment.assignedByUserId !== input.actorUserId) {
      throw new Error('Assignment actor does not match assignedByUserId');
    }

    const oldValue = {
      status: this.lockedRequest.status,
      assignedAt: this.lockedRequest.assignedAt?.toISOString() ?? null,
    };
    this.lockedRequest.status = input.request.status;
    this.lockedRequest.assignedAt = input.request.assignedAt;

    const savedRequest = await this.manager.save(ServiceRequestEntity, this.lockedRequest);
    const savedAssignment = await this.manager.save(
      AssignmentEntity,
      AssignmentMapper.toEntity(input.assignment),
    );
    const assignmentSummary = {
      assignmentId: savedAssignment.id,
      technicianId: savedAssignment.technicianId,
      assignedByUserId: savedAssignment.assignedByUserId,
      status: savedAssignment.status,
      startsAt: savedAssignment.startsAt.toISOString(),
      endsAt: savedAssignment.endsAt.toISOString(),
    };

    await this.manager.save(AuditLogEntity, {
      actorUserId: input.actorUserId,
      action: TECHNICIAN_ASSIGNED,
      entityType: SERVICE_REQUEST_AGGREGATE,
      entityId: savedRequest.id,
      oldValue,
      newValue: {
        status: savedRequest.status,
        assignedAt: savedRequest.assignedAt?.toISOString() ?? null,
        assignment: assignmentSummary,
      },
      requestId: null,
      correlationId: null,
    });
    await this.manager.insert(OutboxEventEntity, {
      eventType: TECHNICIAN_ASSIGNED,
      aggregateType: SERVICE_REQUEST_AGGREGATE,
      aggregateId: savedRequest.id,
      payload: {
        requestId: savedRequest.id,
        ...assignmentSummary,
        technicianUserId: this.technicianSnapshot.technician.userId,
      },
      status: 'pending',
      attempts: 0,
    });

    return {
      request: ServiceRequestMapper.toDomain(savedRequest),
      assignment: AssignmentMapper.toDomain(savedAssignment),
    };
  }
}

@Injectable()
export class AssignmentTypeOrmRepository implements AssignmentRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async executeTransaction<T>(
    lookup: AssignmentTransactionLookup,
    work: (context: AssignmentTransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const lockedRequest = await manager.findOne(ServiceRequestEntity, {
        where: { id: lookup.requestId },
        lock: { mode: 'pessimistic_write' },
      });
      const requestSnapshot = lockedRequest
        ? await this.loadRequestSnapshot(manager, lockedRequest)
        : null;

      const lockedTechnician = await manager.findOne(TechnicianEntity, {
        where: { id: lookup.technicianId },
        lock: { mode: 'pessimistic_write' },
      });
      const technicianSnapshot = lockedTechnician
        ? await this.loadTechnicianSnapshot(manager, lockedTechnician)
        : null;

      return work(
        new TypeOrmAssignmentTransactionContext(
          manager,
          lockedRequest,
          requestSnapshot,
          technicianSnapshot,
        ),
      );
    });
  }

  private async loadRequestSnapshot(
    manager: EntityManager,
    requestEntity: ServiceRequestEntity,
  ): Promise<AssignmentRequestSnapshot> {
    const requiredSkills = await manager.find(ServiceRequestRequiredSkillEntity, {
      where: { serviceRequestId: requestEntity.id },
    });
    const address = await manager.findOneByOrFail(CustomerAddressEntity, {
      id: requestEntity.addressId,
    });

    return {
      request: ServiceRequestMapper.toDomain(requestEntity),
      requiredSkillIds: requiredSkills.map((requiredSkill) => requiredSkill.skillId),
      serviceAreaId: address.serviceAreaId,
    };
  }

  private async loadTechnicianSnapshot(
    manager: EntityManager,
    technicianEntity: TechnicianEntity,
  ): Promise<AssignmentTechnicianSnapshot> {
    const skills = await manager.find(TechnicianSkillEntity, {
      where: { technicianId: technicianEntity.id },
    });
    const serviceAreas = await manager.find(TechnicianServiceAreaEntity, {
      where: { technicianId: technicianEntity.id },
    });
    const availabilityWindows = await manager.find(TechnicianAvailabilityWindowEntity, {
      where: { technicianId: technicianEntity.id },
    });

    technicianEntity.skills = skills;
    technicianEntity.serviceAreas = serviceAreas;

    return {
      technician: TechnicianMapper.toDomain(technicianEntity),
      availabilityWindows: availabilityWindows.map((window) =>
        TechnicianAvailabilityMapper.toDomain(window),
      ),
    };
  }
}
