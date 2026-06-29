import {
  AssignmentForbiddenError,
  ServiceRequestNotFoundError,
  TechnicianNotFoundError,
} from '@application/errors';
import { TechnicianScheduleOverlapError } from '@domain/exceptions';
import {
  Assignment,
  AssignmentTimeSlot,
  RequestPriority,
  RoleCode,
  ServiceRequest,
  ServiceRequestStatus,
  Technician,
  TechnicianAvailabilityWindow,
  TechnicianStatus,
} from '@domain/model';
import {
  AssignedTechnician,
  AssignmentRepository,
  AssignmentTransactionContext,
} from '@domain/repositories';

import { AssignTechnicianUseCase } from '../assign-technician.use-case';

const startsAt = new Date('2026-07-10T09:00:00.000Z');
const endsAt = new Date('2026-07-10T11:00:00.000Z');
const request = ServiceRequest.rehydrate({
  id: 'request-id',
  customerId: 'customer-id',
  categoryId: 'category-id',
  serviceTypeId: 'service-type-id',
  addressId: 'address-id',
  slaPolicyId: 'sla-id',
  status: ServiceRequestStatus.Created,
  priority: RequestPriority.Normal,
  description: 'Repair unit',
  additionalContactInstructions: null,
  preferredStartAt: startsAt,
  preferredEndAt: endsAt,
  estimatedDurationMinutes: 120,
  assignmentDeadlineAt: new Date('2026-07-01T09:00:00.000Z'),
  completionDeadlineAt: new Date('2026-07-11T09:00:00.000Z'),
  triagedAt: null,
  assignedAt: null,
  completedAt: null,
  cancelledAt: null,
  cancellationReason: null,
  escalatedAt: null,
});
const technician = Technician.rehydrate({
  id: 'technician-id',
  userId: 'technician-user-id',
  status: TechnicianStatus.Active,
  dailyAssignmentLimit: 4,
  rating: 4.5,
  skillIds: ['skill-id'],
  serviceAreaIds: ['area-id'],
});
const availabilityWindow = TechnicianAvailabilityWindow.rehydrate({
  id: 'window-id',
  technicianId: technician.id,
  startsAt: new Date('2026-07-10T08:00:00.000Z'),
  endsAt: new Date('2026-07-10T12:00:00.000Z'),
  isAvailable: true,
  reason: null,
});

const createContext = (): jest.Mocked<AssignmentTransactionContext> => ({
  requestSnapshot: {
    request,
    requiredSkillIds: ['skill-id'],
    serviceAreaId: 'area-id',
  },
  technicianSnapshot: { technician, availabilityWindows: [availabilityWindow] },
  hasActiveOverlap: jest.fn().mockResolvedValue(false),
  saveAssignmentOutcome: jest.fn().mockImplementation((input) =>
    Promise.resolve({
      request: input.request,
      assignment: Assignment.rehydrate({
        id: input.assignment.id,
        serviceRequestId: input.assignment.serviceRequestId,
        technicianId: input.assignment.technicianId,
        assignedByUserId: input.assignment.assignedByUserId,
        status: input.assignment.status,
        startsAt: input.assignment.startsAt,
        endsAt: input.assignment.endsAt,
        acceptedAt: null,
        onTheWayAt: null,
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        createdAt: new Date('2026-07-01T10:00:00.000Z'),
        updatedAt: new Date('2026-07-01T10:00:00.000Z'),
      }),
    } satisfies AssignedTechnician),
  ),
});

const createRepository = (context: AssignmentTransactionContext): AssignmentRepository => ({
  executeTransaction: (_lookup, work) => work(context),
});

describe('AssignTechnicianUseCase', () => {
  it.each([RoleCode.Dispatcher, RoleCode.Admin])('assigns for %s', async (role) => {
    const context = createContext();
    const useCase = new AssignTechnicianUseCase(createRepository(context));

    const result = await useCase.execute({
      actor: { userId: 'actor-id', roles: [role] },
      requestId: request.id,
      technicianId: technician.id,
      startsAt,
      endsAt,
    });

    expect(context.hasActiveOverlap.mock.calls[0]).toEqual([
      technician.id,
      expect.any(AssignmentTimeSlot),
    ]);
    expect(context.saveAssignmentOutcome.mock.calls[0]).toEqual([
      expect.objectContaining({ actorUserId: 'actor-id' }),
    ]);
    expect(result.assigned.request.status).toBe(ServiceRequestStatus.Assigned);
    expect(result.assigned.assignment.status).toBe('assigned');
  });

  it('rejects a wrong role before opening a transaction', async () => {
    const executeTransaction = jest.fn();
    const useCase = new AssignTechnicianUseCase({ executeTransaction });

    await expect(
      useCase.execute({
        actor: { userId: 'customer-id', roles: [RoleCode.Customer] },
        requestId: request.id,
        technicianId: technician.id,
        startsAt,
        endsAt,
      }),
    ).rejects.toBeInstanceOf(AssignmentForbiddenError);
    expect(executeTransaction).not.toHaveBeenCalled();
  });

  it('rejects a missing request or technician without saving', async () => {
    const missingRequestContext = createContext();
    missingRequestContext.requestSnapshot = null;
    const missingRequestUseCase = new AssignTechnicianUseCase(
      createRepository(missingRequestContext),
    );

    await expect(execute(missingRequestUseCase)).rejects.toBeInstanceOf(
      ServiceRequestNotFoundError,
    );
    expect(missingRequestContext.saveAssignmentOutcome.mock.calls).toHaveLength(0);

    const missingTechnicianContext = createContext();
    missingTechnicianContext.technicianSnapshot = null;
    const missingTechnicianUseCase = new AssignTechnicianUseCase(
      createRepository(missingTechnicianContext),
    );

    await expect(execute(missingTechnicianUseCase)).rejects.toBeInstanceOf(TechnicianNotFoundError);
    expect(missingTechnicianContext.saveAssignmentOutcome.mock.calls).toHaveLength(0);
  });

  it('rejects an overlap without saving', async () => {
    const context = createContext();
    context.hasActiveOverlap.mockResolvedValue(true);
    const useCase = new AssignTechnicianUseCase(createRepository(context));

    await expect(execute(useCase)).rejects.toBeInstanceOf(TechnicianScheduleOverlapError);
    expect(context.saveAssignmentOutcome.mock.calls).toHaveLength(0);
  });
});

const execute = (useCase: AssignTechnicianUseCase) =>
  useCase.execute({
    actor: { userId: 'actor-id', roles: [RoleCode.Dispatcher] },
    requestId: request.id,
    technicianId: technician.id,
    startsAt,
    endsAt,
  });
