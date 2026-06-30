import {
  TechnicianNotFoundError,
  TechnicianAssignmentReadForbiddenError,
} from '@application/errors';
import { TechnicianAssignmentReadQuery } from '@application/queries/technician-assignment-read.query';
import { TechnicianAssignmentItem } from '@application/read-models';
import {
  AssignmentStatus,
  RequestPriority,
  RoleCode,
  ServiceRequestStatus,
  Technician,
  TechnicianStatus,
} from '@domain/model';
import { TechnicianRepository } from '@domain/repositories';

import { ListTechnicianAssignmentsUseCase } from '../list-technician-assignments.use-case';

describe('ListTechnicianAssignmentsUseCase', () => {
  const assignments = [createAssignmentItem()];
  const findByUserId = jest.fn();
  const listForTechnician = jest.fn();
  let technicianRepository: jest.Mocked<TechnicianRepository>;
  let readQuery: jest.Mocked<TechnicianAssignmentReadQuery>;
  let useCase: ListTechnicianAssignmentsUseCase;

  beforeEach(() => {
    findByUserId.mockReset().mockResolvedValue(createTechnician());
    listForTechnician.mockReset().mockResolvedValue(assignments);
    technicianRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId,
    };
    readQuery = { listForTechnician };
    useCase = new ListTechnicianAssignmentsUseCase(technicianRepository, readQuery);
  });

  it('resolves the actor technician profile before reading assignments', async () => {
    const criteria = {
      status: AssignmentStatus.Assigned,
      from: new Date('2026-07-10T09:00:00.000Z'),
    };

    const result = await useCase.execute({
      actor: { userId: 'technician-user-id', roles: [RoleCode.Technician] },
      criteria,
    });

    expect(findByUserId).toHaveBeenCalledWith('technician-user-id');
    expect(listForTechnician).toHaveBeenCalledWith('technician-id', criteria);
    expect(result).toEqual({ assignments });
  });

  it('rejects non-technician actors before querying', async () => {
    await expect(
      useCase.execute({
        actor: { userId: 'dispatcher-user-id', roles: [RoleCode.Dispatcher] },
        criteria: {},
      }),
    ).rejects.toBeInstanceOf(TechnicianAssignmentReadForbiddenError);

    expect(findByUserId).not.toHaveBeenCalled();
    expect(listForTechnician).not.toHaveBeenCalled();
  });

  it('returns not found when the actor has no technician profile', async () => {
    findByUserId.mockResolvedValueOnce(null);

    await expect(
      useCase.execute({
        actor: { userId: 'missing-technician-user-id', roles: [RoleCode.Technician] },
        criteria: {},
      }),
    ).rejects.toBeInstanceOf(TechnicianNotFoundError);

    expect(listForTechnician).not.toHaveBeenCalled();
  });
});

function createTechnician(): Technician {
  return Technician.rehydrate({
    id: 'technician-id',
    userId: 'technician-user-id',
    status: TechnicianStatus.Active,
    dailyAssignmentLimit: 4,
    rating: 4,
    skillIds: [],
    serviceAreaIds: ['service-area-id'],
  });
}

function createAssignmentItem(): TechnicianAssignmentItem {
  const now = new Date('2026-07-10T09:00:00.000Z');

  return {
    id: 'assignment-id',
    status: AssignmentStatus.Assigned,
    startsAt: now,
    endsAt: new Date('2026-07-10T11:00:00.000Z'),
    acceptedAt: null,
    onTheWayAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    serviceRequest: {
      id: 'request-id',
      status: ServiceRequestStatus.Assigned,
      priority: RequestPriority.Normal,
      description: 'Fixture request',
      preferredStartAt: now,
      preferredEndAt: new Date('2026-07-10T12:00:00.000Z'),
      assignmentDeadlineAt: now,
      completionDeadlineAt: new Date('2026-07-10T18:00:00.000Z'),
      category: { id: 'category-id', code: 'HVAC', name: 'HVAC' },
      serviceType: {
        id: 'service-type-id',
        code: 'AC_REPAIR',
        name: 'AC repair',
        isOther: false,
      },
      address: { id: 'address-id', city: 'Tbilisi', line1: '12 Rustaveli Avenue' },
    },
    createdAt: now,
    updatedAt: now,
  };
}
