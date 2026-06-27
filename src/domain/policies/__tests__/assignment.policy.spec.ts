import {
  ServiceRequestCannotBeAssignedError,
  TechnicianScheduleOverlapError,
} from '@domain/exceptions';
import { RequestPriority, ServiceRequest, ServiceRequestStatus } from '@domain/model';
import { AssignmentPolicy } from '../assignment.policy';

const createRequest = (status: ServiceRequestStatus): ServiceRequest =>
  ServiceRequest.rehydrate({
    id: 'request-id',
    customerId: 'customer-id',
    categoryId: 'category-id',
    serviceTypeId: 'service-type-id',
    addressId: 'address-id',
    slaPolicyId: 'sla-policy-id',
    status,
    priority: RequestPriority.Normal,
    description: 'Repair the unit',
    additionalContactInstructions: null,
    preferredStartAt: new Date('2026-06-22T10:00:00.000Z'),
    preferredEndAt: new Date('2026-06-22T11:00:00.000Z'),
    estimatedDurationMinutes: 60,
    assignmentDeadlineAt: new Date('2026-06-22T09:00:00.000Z'),
    completionDeadlineAt: new Date('2026-06-23T09:00:00.000Z'),
    triagedAt: status === ServiceRequestStatus.Triaged ? new Date() : null,
    assignedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    escalatedAt: null,
  });

describe('AssignmentPolicy', () => {
  it.each([ServiceRequestStatus.Created, ServiceRequestStatus.Triaged])(
    'allows a request in %s status',
    (status) => {
      expect(() =>
        AssignmentPolicy.assertRequestCanBeAssigned(createRequest(status)),
      ).not.toThrow();
    },
  );

  it.each([
    ServiceRequestStatus.NeedsTriage,
    ServiceRequestStatus.Assigned,
    ServiceRequestStatus.AcceptedByTechnician,
    ServiceRequestStatus.TechnicianOnTheWay,
    ServiceRequestStatus.InProgress,
    ServiceRequestStatus.Completed,
    ServiceRequestStatus.Cancelled,
    ServiceRequestStatus.Failed,
  ])('rejects a request in %s status', (status) => {
    expect(() => AssignmentPolicy.assertRequestCanBeAssigned(createRequest(status))).toThrow(
      ServiceRequestCannotBeAssignedError,
    );
  });

  it('allows a free schedule and rejects an active overlap', () => {
    expect(() => AssignmentPolicy.assertNoActiveScheduleOverlap(false)).not.toThrow();
    expect(() => AssignmentPolicy.assertNoActiveScheduleOverlap(true)).toThrow(
      TechnicianScheduleOverlapError,
    );
  });
});
