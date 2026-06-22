import { randomUUID } from 'node:crypto';

import {
  ServiceRequestServiceTypeCategoryMismatchError,
  ServiceRequestTriageForbiddenError,
  ServiceRequestTriageSkillNotFoundError,
} from '@application/errors';
import {
  RequestPriority,
  RoleCode,
  ServiceRequest,
  ServiceRequestStatus,
  ServiceType,
} from '@domain/model';
import { ServiceCatalogAdminRepository, ServiceRequestRepository } from '@domain/repositories';
import { TriageServiceRequestUseCase } from '../triage-service-request.use-case';

describe('TriageServiceRequestUseCase', () => {
  const actorId = randomUUID();
  const requestId = randomUUID();
  const categoryId = randomUUID();
  const serviceTypeId = randomUUID();
  const slaPolicyId = randomUUID();
  const skillId = randomUUID();
  let serviceCatalogRepository: jest.Mocked<ServiceCatalogAdminRepository>;
  let serviceRequestRepository: jest.Mocked<ServiceRequestRepository>;
  let useCase: TriageServiceRequestUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-20T10:15:00.000Z'));
    serviceCatalogRepository = {
      findCategoryById: jest.fn(),
      findCategoryByCode: jest.fn(),
      saveCategory: jest.fn(),
      activeCategoryExists: jest.fn().mockResolvedValue(true),
      activeSlaPolicyExists: jest.fn(),
      findActiveSkillIds: jest.fn().mockResolvedValue([skillId]),
      findServiceTypeById: jest.fn(),
      findActiveServiceTypeForRequest: jest.fn().mockResolvedValue({
        serviceType: createServiceType(),
        slaPolicy: {
          id: slaPolicyId,
          assignmentDeadlineMinutes: 60,
          completionDeadlineMinutes: 480,
          isActive: true,
        },
      }),
      findServiceTypeByCategoryAndCode: jest.fn(),
      findOtherServiceTypeInCategory: jest.fn(),
      saveServiceType: jest.fn(),
    };
    serviceRequestRepository = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(createRequest()),
      triage: jest.fn((input) =>
        Promise.resolve({
          request: input.request,
          requiredSkillIds: input.requiredSkillIds,
        }),
      ),
    };
    useCase = new TriageServiceRequestUseCase(serviceCatalogRepository, serviceRequestRepository);
  });

  afterEach(() => jest.useRealTimers());

  it('triages with explicit classification and recalculates SLA from creation time', async () => {
    const result = await useCase.execute(command());

    expect(result.triaged.request.status).toBe('triaged');
    expect(result.triaged.request.assignmentDeadlineAt.toISOString()).toBe(
      '2026-06-20T10:00:00.000Z',
    );
    expect(result.triaged.request.completionDeadlineAt.toISOString()).toBe(
      '2026-06-20T17:00:00.000Z',
    );
    expect(serviceRequestRepository.triage.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        expectedStatus: 'needs_triage',
        requiredSkillIds: [skillId],
        actorUserId: actorId,
      }),
    );
  });

  it('rejects unauthorized actors before repository access', async () => {
    await expect(
      useCase.execute(command({ actor: { userId: actorId, roles: [RoleCode.Customer] } })),
    ).rejects.toBeInstanceOf(ServiceRequestTriageForbiddenError);

    expect(serviceRequestRepository.findById.mock.calls).toHaveLength(0);
  });

  it('rejects category and service type mismatch', async () => {
    serviceCatalogRepository.findActiveServiceTypeForRequest.mockResolvedValue({
      serviceType: createServiceType({ categoryId: randomUUID() }),
      slaPolicy: {
        id: slaPolicyId,
        assignmentDeadlineMinutes: 60,
        completionDeadlineMinutes: 480,
        isActive: true,
      },
    });

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(
      ServiceRequestServiceTypeCategoryMismatchError,
    );
    expect(serviceRequestRepository.triage.mock.calls).toHaveLength(0);
  });

  it('rejects inactive or unknown required skills', async () => {
    serviceCatalogRepository.findActiveSkillIds.mockResolvedValue([]);

    await expect(useCase.execute(command())).rejects.toBeInstanceOf(
      ServiceRequestTriageSkillNotFoundError,
    );
    expect(serviceRequestRepository.triage.mock.calls).toHaveLength(0);
  });

  const command = (
    overrides: Partial<Parameters<TriageServiceRequestUseCase['execute']>[0]> = {},
  ): Parameters<TriageServiceRequestUseCase['execute']>[0] => ({
    actor: { userId: actorId, roles: [RoleCode.Dispatcher] },
    requestId,
    categoryId,
    serviceTypeId,
    priority: RequestPriority.High,
    estimatedDurationMinutes: 120,
    requiredSkillIds: [skillId],
    ...overrides,
  });

  const createRequest = (): ServiceRequest =>
    ServiceRequest.rehydrate({
      id: requestId,
      customerId: randomUUID(),
      categoryId,
      serviceTypeId: randomUUID(),
      addressId: randomUUID(),
      slaPolicyId: randomUUID(),
      status: ServiceRequestStatus.NeedsTriage,
      priority: RequestPriority.Normal,
      description: 'Unknown fault',
      additionalContactInstructions: null,
      preferredStartAt: new Date('2026-06-21T10:00:00.000Z'),
      preferredEndAt: new Date('2026-06-21T12:00:00.000Z'),
      estimatedDurationMinutes: 60,
      assignmentDeadlineAt: new Date('2026-06-20T11:00:00.000Z'),
      completionDeadlineAt: new Date('2026-06-20T18:00:00.000Z'),
      triagedAt: null,
      assignedAt: null,
      completedAt: null,
      cancelledAt: null,
      cancellationReason: null,
      escalatedAt: null,
      createdAt: new Date('2026-06-20T09:00:00.000Z'),
    });

  const createServiceType = (
    overrides: Partial<{ categoryId: string; isOther: boolean }> = {},
  ): ServiceType =>
    ServiceType.rehydrate({
      id: serviceTypeId,
      categoryId: overrides.categoryId ?? categoryId,
      slaPolicyId,
      code: 'REPAIR',
      name: 'Repair',
      description: null,
      defaultPriority: RequestPriority.Normal,
      estimatedDurationMinutes: 60,
      isOther: overrides.isOther ?? false,
      isActive: true,
      requiredSkillIds: [skillId],
    });
});
