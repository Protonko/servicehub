import { TechnicianAssignmentItem } from '@application/read-models';

import { TechnicianAssignmentRow } from './technician-assignment-read.types';

export class TechnicianAssignmentReadMapper {
  static toItem(row: TechnicianAssignmentRow): TechnicianAssignmentItem {
    return {
      id: row.assignmentId,
      status: row.assignmentStatus,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      acceptedAt: row.acceptedAt,
      onTheWayAt: row.onTheWayAt,
      startedAt: row.startedAt,
      completedAt: row.assignmentCompletedAt,
      cancelledAt: row.cancelledAt,
      cancellationReason: row.cancellationReason,
      serviceRequest: {
        id: row.requestId,
        status: row.requestStatus,
        priority: row.requestPriority,
        description: row.requestDescription,
        preferredStartAt: row.preferredStartAt,
        preferredEndAt: row.preferredEndAt,
        assignmentDeadlineAt: row.assignmentDeadlineAt,
        completionDeadlineAt: row.completionDeadlineAt,
        category: {
          id: row.categoryId,
          code: row.categoryCode,
          name: row.categoryName,
        },
        serviceType: {
          id: row.serviceTypeId,
          code: row.serviceTypeCode,
          name: row.serviceTypeName,
          isOther: row.serviceTypeIsOther,
        },
        address: {
          id: row.addressId,
          city: row.addressCity,
          line1: row.addressLine1,
        },
      },
      createdAt: row.assignmentCreatedAt,
      updatedAt: row.assignmentUpdatedAt,
    };
  }
}
