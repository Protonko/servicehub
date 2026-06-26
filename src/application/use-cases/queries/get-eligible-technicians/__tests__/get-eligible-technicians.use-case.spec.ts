import { randomUUID } from 'node:crypto';

import {
  InvalidTechnicianEligibilityWindowError,
  ServiceRequestNotAssignableForEligibilityError,
  ServiceRequestNotFoundError,
} from '@application/errors';
import { TechnicianEligibilityQuery } from '@application/queries/technician-eligibility.query';
import { RequestPriority, ServiceRequest, ServiceRequestStatus } from '@domain/model';
import { ServiceRequestRepository } from '@domain/repositories';

import { GetEligibleTechniciansUseCase } from '../get-eligible-technicians.use-case';

describe('GetEligibleTechniciansUseCase', () => {
  const requestId = randomUUID();
  const startsAt = new Date('2026-07-10T09:00:00.000Z');
  const endsAt = new Date('2026-07-10T11:00:00.000Z');

  const createRepository = () =>
    ({
      create: jest.fn(),
      findById: jest.fn(),
      triage: jest.fn(),
    }) as jest.Mocked<ServiceRequestRepository>;

  const createQuery = () =>
    ({
      findEligibleTechnicians: jest.fn().mockResolvedValue([]),
    }) as jest.Mocked<TechnicianEligibilityQuery>;

  it('returns the advisory query result for an assignable request', async () => {
    const repository = createRepository();
    const query = createQuery();
    const request = createRequest(ServiceRequestStatus.Triaged);
    repository.findById.mockResolvedValue(request);
    query.findEligibleTechnicians.mockResolvedValue([
      {
        technicianId: 'technician-id',
        user: { id: 'user-id', fullName: 'Available Technician' },
        rating: 4.5,
        dailyAssignmentLimit: 4,
        skillIds: ['skill-id'],
        serviceAreaIds: ['area-id'],
        activeAssignmentCount: 0,
      },
    ]);
    const useCase = new GetEligibleTechniciansUseCase(repository, query);

    const result = await useCase.execute({ requestId, startsAt, endsAt });

    expect(result).toEqual({
      requestId,
      startsAt,
      endsAt,
      candidates: [expect.objectContaining({ technicianId: 'technician-id' })],
    });
    expect(query.findEligibleTechnicians.mock.calls).toEqual([[requestId, startsAt, endsAt]]);
  });

  it('rejects a missing request', async () => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(null);
    const query = createQuery();
    const useCase = new GetEligibleTechniciansUseCase(repository, query);

    await expect(useCase.execute({ requestId, startsAt, endsAt })).rejects.toBeInstanceOf(
      ServiceRequestNotFoundError,
    );
    expect(query.findEligibleTechnicians.mock.calls).toHaveLength(0);
  });

  it.each([
    ServiceRequestStatus.NeedsTriage,
    ServiceRequestStatus.Assigned,
    ServiceRequestStatus.Completed,
    ServiceRequestStatus.Cancelled,
  ])('rejects request status %s', async (status) => {
    const repository = createRepository();
    repository.findById.mockResolvedValue(createRequest(status));
    const query = createQuery();
    const useCase = new GetEligibleTechniciansUseCase(repository, query);

    await expect(useCase.execute({ requestId, startsAt, endsAt })).rejects.toBeInstanceOf(
      ServiceRequestNotAssignableForEligibilityError,
    );
    expect(query.findEligibleTechnicians.mock.calls).toHaveLength(0);
  });

  it('rejects invalid and reversed windows before loading the request', async () => {
    const repository = createRepository();
    const useCase = new GetEligibleTechniciansUseCase(repository, createQuery());

    await expect(
      useCase.execute({ requestId, startsAt: endsAt, endsAt: startsAt }),
    ).rejects.toBeInstanceOf(InvalidTechnicianEligibilityWindowError);
    await expect(
      useCase.execute({ requestId, startsAt: new Date('invalid'), endsAt }),
    ).rejects.toBeInstanceOf(InvalidTechnicianEligibilityWindowError);
    expect(repository.findById.mock.calls).toHaveLength(0);
  });

  const createRequest = (status: ServiceRequestStatus): ServiceRequest =>
    ServiceRequest.rehydrate({
      id: requestId,
      customerId: randomUUID(),
      categoryId: randomUUID(),
      serviceTypeId: randomUUID(),
      addressId: randomUUID(),
      slaPolicyId: randomUUID(),
      status,
      priority: RequestPriority.Normal,
      description: 'Eligibility request',
      additionalContactInstructions: null,
      preferredStartAt: startsAt,
      preferredEndAt: endsAt,
      estimatedDurationMinutes: 120,
      assignmentDeadlineAt: startsAt,
      completionDeadlineAt: endsAt,
      triagedAt: status === ServiceRequestStatus.Triaged ? startsAt : null,
      assignedAt: null,
      completedAt: status === ServiceRequestStatus.Completed ? endsAt : null,
      cancelledAt: status === ServiceRequestStatus.Cancelled ? endsAt : null,
      cancellationReason: null,
      escalatedAt: null,
    });
});
