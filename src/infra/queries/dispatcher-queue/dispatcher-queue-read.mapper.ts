import { DispatcherQueueItem } from '@application/read-models';

import { DispatcherQueueRow } from './dispatcher-queue-read.types';

export class DispatcherQueueReadMapper {
  static toItem(row: DispatcherQueueRow): DispatcherQueueItem {
    return {
      id: row.requestId,
      customer: { id: row.customerId, fullName: row.customerFullName },
      category: { id: row.categoryId, code: row.categoryCode, name: row.categoryName },
      serviceType: {
        id: row.serviceTypeId,
        code: row.serviceTypeCode,
        name: row.serviceTypeName,
        isOther: row.serviceTypeIsOther,
      },
      address: { id: row.addressId, city: row.addressCity, line1: row.addressLine1 },
      serviceArea: {
        id: row.serviceAreaId,
        code: row.serviceAreaCode,
        name: row.serviceAreaName,
      },
      status: row.status,
      priority: row.priority,
      slaState: row.slaState,
      relevantDeadlineAt: row.relevantDeadlineAt,
      preferredStartAt: row.preferredStartAt,
      preferredEndAt: row.preferredEndAt,
      assignmentDeadlineAt: row.assignmentDeadlineAt,
      completionDeadlineAt: row.completionDeadlineAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
