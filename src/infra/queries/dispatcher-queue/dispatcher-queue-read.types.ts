import { DispatcherQueueSlaState } from '@application/read-models';
import { RequestPriority, ServiceRequestStatus } from '@domain/model';

export interface DispatcherQueueRow {
  requestId: string;
  customerId: string;
  customerFullName: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  serviceTypeId: string;
  serviceTypeCode: string;
  serviceTypeName: string;
  serviceTypeIsOther: boolean;
  addressId: string;
  addressCity: string;
  addressLine1: string;
  serviceAreaId: string;
  serviceAreaCode: string;
  serviceAreaName: string;
  status: ServiceRequestStatus;
  priority: RequestPriority;
  slaState: DispatcherQueueSlaState;
  relevantDeadlineAt: Date;
  preferredStartAt: Date;
  preferredEndAt: Date;
  assignmentDeadlineAt: Date;
  completionDeadlineAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
