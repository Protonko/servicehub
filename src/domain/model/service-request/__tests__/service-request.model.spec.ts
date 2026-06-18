import {
  InvalidServiceRequestTransitionError,
  ServiceRequestCannotBeAssignedError,
  ServiceRequestCannotBeCancelledError,
  ServiceRequestCannotBeTriagedError,
} from '@domain/exceptions';
import { RequestPriority, ServiceRequest, ServiceRequestStatus } from '@domain/model';

const baseCreateInput = {
  customerId: 'customer-id',
  categoryId: 'category-id',
  serviceTypeId: 'service-type-id',
  addressId: 'address-id',
  slaPolicyId: 'sla-policy-id',
  priority: RequestPriority.Normal,
  description: ' The air conditioner does not cool. ',
  additionalContactInstructions: '  Call before arrival. ',
  preferredStartAt: new Date('2026-06-18T10:00:00.000Z'),
  preferredEndAt: new Date('2026-06-18T14:00:00.000Z'),
  estimatedDurationMinutes: 90,
  assignmentDeadlineAt: new Date('2026-06-18T11:00:00.000Z'),
  completionDeadlineAt: new Date('2026-06-19T10:00:00.000Z'),
};

describe('ServiceRequest', () => {
  it('starts normal service type requests in created status and normalizes text', () => {
    const request = ServiceRequest.create({
      ...baseCreateInput,
      isOtherServiceType: false,
    });

    expect(request.status).toBe(ServiceRequestStatus.Created);
    expect(request.description).toBe('The air conditioner does not cool.');
    expect(request.additionalContactInstructions).toBe('Call before arrival.');
    expect(request.canBeAssigned()).toBe(true);
  });

  it('starts Other service type requests in needs_triage status', () => {
    const request = ServiceRequest.create({
      ...baseCreateInput,
      isOtherServiceType: true,
    });

    expect(request.status).toBe(ServiceRequestStatus.NeedsTriage);
    expect(request.canBeAssigned()).toBe(false);
  });

  it('rejects blank descriptions and invalid preferred time windows', () => {
    expect(() =>
      ServiceRequest.create({
        ...baseCreateInput,
        description: ' ',
        isOtherServiceType: false,
      }),
    ).toThrow('description must not be blank');

    expect(() =>
      ServiceRequest.create({
        ...baseCreateInput,
        preferredStartAt: new Date('2026-06-18T14:00:00.000Z'),
        preferredEndAt: new Date('2026-06-18T10:00:00.000Z'),
        isOtherServiceType: false,
      }),
    ).toThrow('preferredStartAt must be before preferredEndAt');
  });

  it('does not allow needs_triage requests to be assigned before triage', () => {
    const request = ServiceRequest.create({
      ...baseCreateInput,
      isOtherServiceType: true,
    });

    expect(() => request.assign()).toThrow(ServiceRequestCannotBeAssignedError);
  });

  it('allows created and triaged requests to be assigned', () => {
    const assignedCreatedRequest = ServiceRequest.create({
      ...baseCreateInput,
      isOtherServiceType: false,
    }).assign(new Date('2026-06-18T10:15:00.000Z'));

    const assignedTriagedRequest = ServiceRequest.create({
      ...baseCreateInput,
      isOtherServiceType: true,
    })
      .triage(new Date('2026-06-18T10:05:00.000Z'))
      .assign(new Date('2026-06-18T10:15:00.000Z'));

    expect(assignedCreatedRequest.status).toBe(ServiceRequestStatus.Assigned);
    expect(assignedCreatedRequest.assignedAt).toEqual(new Date('2026-06-18T10:15:00.000Z'));
    expect(assignedTriagedRequest.status).toBe(ServiceRequestStatus.Assigned);
  });

  it('does not allow cancelled or completed requests to be triaged', () => {
    const request = ServiceRequest.create({
      ...baseCreateInput,
      isOtherServiceType: false,
    });
    const completedRequest = request
      .assign()
      .acceptByTechnician()
      .markTechnicianOnTheWay()
      .startWork()
      .complete();
    const cancelledRequest = request.cancel();

    expect(() => completedRequest.triage()).toThrow(ServiceRequestCannotBeTriagedError);
    expect(() => cancelledRequest.triage()).toThrow(ServiceRequestCannotBeTriagedError);
  });

  it('does not allow completed requests to be cancelled', () => {
    const completedRequest = ServiceRequest.create({
      ...baseCreateInput,
      isOtherServiceType: false,
    })
      .assign()
      .acceptByTechnician()
      .markTechnicianOnTheWay()
      .startWork()
      .complete(new Date('2026-06-18T13:00:00.000Z'));

    expect(() => completedRequest.cancel()).toThrow(ServiceRequestCannotBeCancelledError);
  });

  it('does not allow cancelled requests to be assigned', () => {
    const cancelledRequest = ServiceRequest.create({
      ...baseCreateInput,
      isOtherServiceType: false,
    }).cancel({
      cancelledAt: new Date('2026-06-18T10:30:00.000Z'),
      reason: ' Customer no longer needs service. ',
    });

    expect(cancelledRequest.status).toBe(ServiceRequestStatus.Cancelled);
    expect(cancelledRequest.cancellationReason).toBe('Customer no longer needs service.');
    expect(() => cancelledRequest.assign()).toThrow(ServiceRequestCannotBeAssignedError);
  });

  it('excludes completed and cancelled requests from SLA breach candidates', () => {
    const request = ServiceRequest.create({
      ...baseCreateInput,
      isOtherServiceType: false,
    });

    const completedRequest = request
      .assign()
      .acceptByTechnician()
      .markTechnicianOnTheWay()
      .startWork()
      .complete();
    const cancelledRequest = request.cancel();

    expect(request.isSlaBreachCandidate()).toBe(true);
    expect(completedRequest.isSlaBreachCandidate()).toBe(false);
    expect(cancelledRequest.isSlaBreachCandidate()).toBe(false);
  });

  it('enforces the technician lifecycle order', () => {
    const assignedRequest = ServiceRequest.create({
      ...baseCreateInput,
      isOtherServiceType: false,
    }).assign();

    expect(() => assignedRequest.startWork()).toThrow(InvalidServiceRequestTransitionError);

    const completedRequest = assignedRequest
      .acceptByTechnician()
      .markTechnicianOnTheWay()
      .startWork()
      .complete(new Date('2026-06-18T13:00:00.000Z'));

    expect(completedRequest.status).toBe(ServiceRequestStatus.Completed);
    expect(completedRequest.completedAt).toEqual(new Date('2026-06-18T13:00:00.000Z'));
  });
});
