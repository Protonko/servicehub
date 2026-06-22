import { ServiceRequestOtherTypeCannotBeTriagedError } from '@domain/exceptions';
import { RequestPriority, ServiceRequest, ServiceRequestStatus } from '@domain/model';
import { RequestTriagePolicy } from '../request-triage.policy';

describe('RequestTriagePolicy', () => {
  const request = ServiceRequest.create({
    customerId: 'customer-id',
    categoryId: 'old-category-id',
    serviceTypeId: 'other-type-id',
    addressId: 'address-id',
    slaPolicyId: 'old-sla-id',
    priority: RequestPriority.Normal,
    description: 'Unknown fault',
    preferredStartAt: new Date('2026-06-21T10:00:00.000Z'),
    preferredEndAt: new Date('2026-06-21T12:00:00.000Z'),
    estimatedDurationMinutes: 60,
    assignmentDeadlineAt: new Date('2026-06-20T11:00:00.000Z'),
    completionDeadlineAt: new Date('2026-06-20T18:00:00.000Z'),
    isOtherServiceType: true,
  });
  const input = {
    categoryId: 'new-category-id',
    serviceTypeId: 'repair-type-id',
    slaPolicyId: 'new-sla-id',
    priority: RequestPriority.High,
    estimatedDurationMinutes: 120,
    assignmentDeadlineAt: new Date('2026-06-20T10:30:00.000Z'),
    completionDeadlineAt: new Date('2026-06-20T16:00:00.000Z'),
    triagedAt: new Date('2026-06-20T10:15:00.000Z'),
    isOtherServiceType: false,
  };

  it('reclassifies a request and marks it triaged', () => {
    const triaged = RequestTriagePolicy.triage(request, input);

    expect(triaged.status).toBe(ServiceRequestStatus.Triaged);
    expect(triaged.categoryId).toBe(input.categoryId);
    expect(triaged.serviceTypeId).toBe(input.serviceTypeId);
    expect(triaged.slaPolicyId).toBe(input.slaPolicyId);
    expect(triaged.priority).toBe(input.priority);
    expect(triaged.estimatedDurationMinutes).toBe(input.estimatedDurationMinutes);
    expect(triaged.assignmentDeadlineAt).toEqual(input.assignmentDeadlineAt);
    expect(triaged.completionDeadlineAt).toEqual(input.completionDeadlineAt);
    expect(triaged.triagedAt).toEqual(input.triagedAt);
  });

  it('rejects Other as the target service type', () => {
    expect(() =>
      RequestTriagePolicy.triage(request, { ...input, isOtherServiceType: true }),
    ).toThrow(ServiceRequestOtherTypeCannotBeTriagedError);
  });
});
