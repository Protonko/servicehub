import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import { ServiceRequestReadScope } from '@application/auth';
import {
  ServiceRequestPagination,
  ServiceRequestReadQuery,
  ServiceRequestSearchCriteria,
  ServiceRequestSearchResult,
} from '@application/queries/service-request-read.query';
import { ServiceRequestDetail } from '@application/read-models';
import { ServiceRequestEntity } from '@db/entities/service-request.entity';

import { ServiceRequestReadMapper } from './service-request-read.mapper';
import { ServiceRequestDetailRow, ServiceRequestSummaryRow } from './service-request-read.types';

@Injectable()
export class ServiceRequestTypeOrmReadQuery implements ServiceRequestReadQuery {
  constructor(
    @InjectRepository(ServiceRequestEntity)
    private readonly serviceRequestRepository: Repository<ServiceRequestEntity>,
  ) {}

  async search(
    criteria: ServiceRequestSearchCriteria,
    scope: ServiceRequestReadScope,
    pagination: ServiceRequestPagination,
  ): Promise<ServiceRequestSearchResult> {
    const countQuery = this.applySearchCriteria(
      this.applyScope(this.serviceRequestRepository.createQueryBuilder('request'), scope),
      criteria,
    );
    const itemQuery = this.applySearchCriteria(
      this.applyScope(
        this.serviceRequestRepository
          .createQueryBuilder('request')
          .innerJoin('request.customer', 'customer')
          .innerJoin('request.category', 'category')
          .innerJoin('request.serviceType', 'serviceType')
          .innerJoin('request.address', 'address'),
        scope,
      ),
      criteria,
    )
      .select([
        'request.id AS "requestId"',
        'customer.id AS "customerId"',
        'customer.full_name AS "customerFullName"',
        'category.id AS "categoryId"',
        'category.code AS "categoryCode"',
        'category.name AS "categoryName"',
        'serviceType.id AS "serviceTypeId"',
        'serviceType.code AS "serviceTypeCode"',
        'serviceType.name AS "serviceTypeName"',
        'serviceType.is_other AS "serviceTypeIsOther"',
        'address.id AS "addressId"',
        'address.city AS "addressCity"',
        'address.line1 AS "addressLine1"',
        'request.status AS "status"',
        'request.priority AS "priority"',
        'request.preferred_start_at AS "preferredStartAt"',
        'request.preferred_end_at AS "preferredEndAt"',
        'request.assignment_deadline_at AS "assignmentDeadlineAt"',
        'request.completion_deadline_at AS "completionDeadlineAt"',
        'request.created_at AS "createdAt"',
        'request.updated_at AS "updatedAt"',
      ])
      .orderBy('request.created_at', 'DESC')
      .addOrderBy('request.id', 'DESC')
      .limit(pagination.limit)
      .offset(pagination.offset);

    const [rows, total] = await Promise.all([
      itemQuery.getRawMany<ServiceRequestSummaryRow>(),
      countQuery.getCount(),
    ]);

    return {
      items: rows.map((row) => ServiceRequestReadMapper.toSummary(row)),
      total,
    };
  }

  async findById(
    requestId: string,
    scope: ServiceRequestReadScope,
  ): Promise<ServiceRequestDetail | null> {
    const rows = await this.applyScope(
      this.serviceRequestRepository
        .createQueryBuilder('request')
        .innerJoin('request.customer', 'customer')
        .innerJoin('request.category', 'category')
        .innerJoin('request.serviceType', 'serviceType')
        .innerJoin('request.address', 'address')
        .innerJoin('address.serviceArea', 'serviceArea')
        .innerJoin('request.slaPolicy', 'slaPolicy')
        .leftJoin('request.requiredSkills', 'requiredSkill')
        .leftJoin('requiredSkill.skill', 'skill')
        .leftJoin('request.attachments', 'attachment'),
      scope,
    )
      .select([
        'request.id AS "requestId"',
        'customer.id AS "customerId"',
        'customer.full_name AS "customerFullName"',
        'customer.email AS "customerEmail"',
        'customer.phone AS "customerPhone"',
        'category.id AS "categoryId"',
        'category.code AS "categoryCode"',
        'category.name AS "categoryName"',
        'serviceType.id AS "serviceTypeId"',
        'serviceType.code AS "serviceTypeCode"',
        'serviceType.name AS "serviceTypeName"',
        'serviceType.is_other AS "serviceTypeIsOther"',
        'address.id AS "addressId"',
        'address.line1 AS "addressLine1"',
        'address.line2 AS "addressLine2"',
        'address.city AS "addressCity"',
        'address.postal_code AS "addressPostalCode"',
        'address.notes AS "addressNotes"',
        'serviceArea.id AS "serviceAreaId"',
        'serviceArea.code AS "serviceAreaCode"',
        'serviceArea.name AS "serviceAreaName"',
        'slaPolicy.id AS "slaPolicyId"',
        'slaPolicy.code AS "slaPolicyCode"',
        'slaPolicy.name AS "slaPolicyName"',
        'request.status AS "status"',
        'request.priority AS "priority"',
        'request.description AS "description"',
        'request.additional_contact_instructions AS "additionalContactInstructions"',
        'request.preferred_start_at AS "preferredStartAt"',
        'request.preferred_end_at AS "preferredEndAt"',
        'request.estimated_duration_minutes AS "estimatedDurationMinutes"',
        'request.assignment_deadline_at AS "assignmentDeadlineAt"',
        'request.completion_deadline_at AS "completionDeadlineAt"',
        'request.triaged_at AS "triagedAt"',
        'request.assigned_at AS "assignedAt"',
        'request.completed_at AS "completedAt"',
        'request.cancelled_at AS "cancelledAt"',
        'request.cancellation_reason AS "cancellationReason"',
        'request.escalated_at AS "escalatedAt"',
        'request.created_at AS "createdAt"',
        'request.updated_at AS "updatedAt"',
        'skill.id AS "skillId"',
        'skill.code AS "skillCode"',
        'skill.name AS "skillName"',
        'attachment.id AS "attachmentId"',
        'attachment.uploaded_by_user_id AS "attachmentUploadedByUserId"',
        'attachment.file_name AS "attachmentFileName"',
        'attachment.mime_type AS "attachmentMimeType"',
        'attachment.storage_key AS "attachmentStorageKey"',
        'attachment.kind AS "attachmentKind"',
        'attachment.created_at AS "attachmentCreatedAt"',
      ])
      .andWhere('request.id = :requestId', { requestId })
      .getRawMany<ServiceRequestDetailRow>();

    return rows.length === 0 ? null : ServiceRequestReadMapper.toDetail(rows);
  }

  private applyScope(
    query: SelectQueryBuilder<ServiceRequestEntity>,
    scope: ServiceRequestReadScope,
  ): SelectQueryBuilder<ServiceRequestEntity> {
    if (scope.kind === 'customer') {
      query.andWhere('request.customer_id = :scopeCustomerId', {
        scopeCustomerId: scope.customerId,
      });
    }

    return query;
  }

  private applySearchCriteria(
    query: SelectQueryBuilder<ServiceRequestEntity>,
    criteria: ServiceRequestSearchCriteria,
  ): SelectQueryBuilder<ServiceRequestEntity> {
    if (criteria.status) {
      query.andWhere('request.status = :status', { status: criteria.status });
    }
    if (criteria.priority) {
      query.andWhere('request.priority = :priority', { priority: criteria.priority });
    }
    if (criteria.categoryId) {
      query.andWhere('request.category_id = :categoryId', { categoryId: criteria.categoryId });
    }
    if (criteria.serviceTypeId) {
      query.andWhere('request.service_type_id = :serviceTypeId', {
        serviceTypeId: criteria.serviceTypeId,
      });
    }
    if (criteria.createdFrom) {
      query.andWhere('request.created_at >= :createdFrom', { createdFrom: criteria.createdFrom });
    }
    if (criteria.createdTo) {
      query.andWhere('request.created_at <= :createdTo', { createdTo: criteria.createdTo });
    }

    return query;
  }
}
