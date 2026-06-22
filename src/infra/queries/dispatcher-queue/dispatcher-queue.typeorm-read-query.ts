import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

import {
  DispatcherQueueCriteria,
  DispatcherQueuePagination,
  DispatcherQueueReadQuery,
  DispatcherQueueSearchResult,
} from '@application/queries/dispatcher-queue-read.query';
import { ServiceRequestEntity } from '@db/entities/service-request.entity';
import { ServiceRequestStatus } from '@domain/model';
import { minutesToMilliseconds } from '@common/utils/minutes-to-milliseconds';

import { DispatcherQueueReadMapper } from './dispatcher-queue-read.mapper';
import { DispatcherQueueRow } from './dispatcher-queue-read.types';

interface QueueEvaluationWindow {
  now: Date;
  atRiskUntil: Date;
}

const ACTIVE_STATUSES = [
  ServiceRequestStatus.Created,
  ServiceRequestStatus.NeedsTriage,
  ServiceRequestStatus.Triaged,
  ServiceRequestStatus.Assigned,
  ServiceRequestStatus.AcceptedByTechnician,
  ServiceRequestStatus.TechnicianOnTheWay,
  ServiceRequestStatus.InProgress,
];

const PRE_ASSIGNMENT_STATUSES = [
  ServiceRequestStatus.Created,
  ServiceRequestStatus.NeedsTriage,
  ServiceRequestStatus.Triaged,
];

const RELEVANT_DEADLINE_SQL = `
  CASE
    WHEN request.status IN (:...preAssignmentStatuses) THEN request.assignment_deadline_at
    ELSE request.completion_deadline_at
  END
`;

const SLA_STATE_SQL = `
  CASE
    WHEN ${RELEVANT_DEADLINE_SQL} <= :queueNow THEN 'breached'
    WHEN ${RELEVANT_DEADLINE_SQL} <= :atRiskUntil THEN 'at_risk'
    ELSE 'on_track'
  END
`;

const RANK_SQL = `
  CASE
    WHEN ${RELEVANT_DEADLINE_SQL} <= :queueNow THEN 0
    WHEN request.priority = 'urgent' THEN 1
    WHEN ${RELEVANT_DEADLINE_SQL} <= :atRiskUntil THEN 2
    ELSE 3
  END
`;

@Injectable()
export class DispatcherQueueTypeOrmReadQuery implements DispatcherQueueReadQuery {
  constructor(
    @InjectRepository(ServiceRequestEntity)
    private readonly serviceRequestRepository: Repository<ServiceRequestEntity>,
  ) {}

  async search(
    criteria: DispatcherQueueCriteria,
    pagination: DispatcherQueuePagination,
  ): Promise<DispatcherQueueSearchResult> {
    const now = new Date();
    const window = {
      now,
      atRiskUntil: new Date(now.getTime() + minutesToMilliseconds(60)),
    };

    const countQuery = this.applyCriteria(
      this.serviceRequestRepository
        .createQueryBuilder('request')
        .innerJoin('request.address', 'address'),
      criteria,
      window,
    );
    const itemQuery = this.applyCriteria(
      this.serviceRequestRepository
        .createQueryBuilder('request')
        .innerJoin('request.customer', 'customer')
        .innerJoin('request.category', 'category')
        .innerJoin('request.serviceType', 'serviceType')
        .innerJoin('request.address', 'address')
        .innerJoin('address.serviceArea', 'serviceArea'),
      criteria,
      window,
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
        'serviceArea.id AS "serviceAreaId"',
        'serviceArea.code AS "serviceAreaCode"',
        'serviceArea.name AS "serviceAreaName"',
        'request.status AS "status"',
        'request.priority AS "priority"',
        'request.preferred_start_at AS "preferredStartAt"',
        'request.preferred_end_at AS "preferredEndAt"',
        'request.assignment_deadline_at AS "assignmentDeadlineAt"',
        'request.completion_deadline_at AS "completionDeadlineAt"',
        'request.created_at AS "createdAt"',
        'request.updated_at AS "updatedAt"',
      ])
      .addSelect(RELEVANT_DEADLINE_SQL, 'relevantDeadlineAt')
      .addSelect(SLA_STATE_SQL, 'slaState')
      .orderBy(RANK_SQL, 'ASC')
      .addOrderBy(RELEVANT_DEADLINE_SQL, 'ASC')
      .addOrderBy('request.created_at', 'ASC')
      .addOrderBy('request.id', 'ASC')
      .limit(pagination.limit)
      .offset(pagination.offset);

    const [rows, total] = await Promise.all([
      itemQuery.getRawMany<DispatcherQueueRow>(),
      countQuery.getCount(),
    ]);

    return { items: rows.map((row) => DispatcherQueueReadMapper.toItem(row)), total };
  }

  private applyCriteria(
    query: SelectQueryBuilder<ServiceRequestEntity>,
    criteria: DispatcherQueueCriteria,
    window: QueueEvaluationWindow,
  ): SelectQueryBuilder<ServiceRequestEntity> {
    query.setParameters({
      activeStatuses: ACTIVE_STATUSES,
      preAssignmentStatuses: PRE_ASSIGNMENT_STATUSES,
      queueNow: window.now,
      atRiskUntil: window.atRiskUntil,
    });

    if (criteria.status) {
      query.andWhere('request.status = :status', { status: criteria.status });
    } else {
      query.andWhere('request.status IN (:...activeStatuses)');
    }
    if (criteria.priority) {
      query.andWhere('request.priority = :priority', { priority: criteria.priority });
    }
    if (criteria.serviceAreaId) {
      query.andWhere('address.service_area_id = :serviceAreaId', {
        serviceAreaId: criteria.serviceAreaId,
      });
    }
    if (criteria.slaState) {
      query.andWhere(`${SLA_STATE_SQL} = :slaState`, { slaState: criteria.slaState });
    }

    return query;
  }
}
