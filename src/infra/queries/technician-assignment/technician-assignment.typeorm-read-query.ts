import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import {
  TechnicianAssignmentCriteria,
  TechnicianAssignmentReadQuery,
} from '@application/queries/technician-assignment-read.query';
import { TechnicianAssignmentItem } from '@application/read-models';

import { TechnicianAssignmentReadMapper } from './technician-assignment-read.mapper';
import { TechnicianAssignmentRow } from './technician-assignment-read.types';

@Injectable()
export class TechnicianAssignmentTypeOrmReadQuery implements TechnicianAssignmentReadQuery {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async listForTechnician(
    technicianId: string,
    criteria: TechnicianAssignmentCriteria,
  ): Promise<TechnicianAssignmentItem[]> {
    const conditions = ['assignment.technician_id = $1'];
    const parameters: unknown[] = [technicianId];

    if (criteria.status) {
      parameters.push(criteria.status);
      conditions.push(`assignment.status = $${parameters.length}::assignment_status`);
    }

    if (criteria.from) {
      parameters.push(criteria.from);
      conditions.push(`assignment.ends_at > $${parameters.length}`);
    }

    if (criteria.to) {
      parameters.push(criteria.to);
      conditions.push(`assignment.starts_at < $${parameters.length}`);
    }

    const rows = await this.dataSource.query<TechnicianAssignmentRow[]>(
      `
        SELECT
          assignment.id AS "assignmentId",
          assignment.status AS "assignmentStatus",
          assignment.starts_at AS "startsAt",
          assignment.ends_at AS "endsAt",
          assignment.accepted_at AS "acceptedAt",
          assignment.on_the_way_at AS "onTheWayAt",
          assignment.started_at AS "startedAt",
          assignment.completed_at AS "assignmentCompletedAt",
          assignment.cancelled_at AS "cancelledAt",
          assignment.cancellation_reason AS "cancellationReason",
          assignment.created_at AS "assignmentCreatedAt",
          assignment.updated_at AS "assignmentUpdatedAt",
          request.id AS "requestId",
          request.status AS "requestStatus",
          request.priority AS "requestPriority",
          request.description AS "requestDescription",
          request.preferred_start_at AS "preferredStartAt",
          request.preferred_end_at AS "preferredEndAt",
          request.assignment_deadline_at AS "assignmentDeadlineAt",
          request.completion_deadline_at AS "completionDeadlineAt",
          category.id AS "categoryId",
          category.code AS "categoryCode",
          category.name AS "categoryName",
          service_type.id AS "serviceTypeId",
          service_type.code AS "serviceTypeCode",
          service_type.name AS "serviceTypeName",
          service_type.is_other AS "serviceTypeIsOther",
          address.id AS "addressId",
          address.city AS "addressCity",
          address.line1 AS "addressLine1"
        FROM assignments assignment
        INNER JOIN service_requests request ON request.id = assignment.service_request_id
        INNER JOIN service_categories category ON category.id = request.category_id
        INNER JOIN service_types service_type ON service_type.id = request.service_type_id
        INNER JOIN customer_addresses address ON address.id = request.address_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY assignment.starts_at ASC, assignment.id ASC
      `,
      parameters,
    );

    return rows.map((row) => TechnicianAssignmentReadMapper.toItem(row));
  }
}
