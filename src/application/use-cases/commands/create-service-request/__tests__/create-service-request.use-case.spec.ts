import { randomUUID } from 'node:crypto';

import {
  ServiceRequestAddressNotFoundError,
  ServiceRequestPreferredWindowInPastError,
  ServiceRequestServiceTypeCategoryMismatchError,
} from '@application/errors';
import { CustomerAddress, RequestPriority, ServiceType } from '@domain/model';
import {
  CreatedServiceRequest,
  CustomerAddressRepository,
  ServiceCatalogAdminRepository,
  ServiceRequestRepository,
} from '@domain/repositories';
import { CreateServiceRequestUseCase } from '../create-service-request.use-case';

describe('CreateServiceRequestUseCase', () => {
  const customerId = randomUUID();
  const categoryId = randomUUID();
  const serviceTypeId = randomUUID();
  const addressId = randomUUID();
  const slaPolicyId = randomUUID();
  const skillId = randomUUID();

  let serviceCatalogRepository: jest.Mocked<ServiceCatalogAdminRepository>;
  let customerAddressRepository: jest.Mocked<CustomerAddressRepository>;
  let serviceRequestRepository: jest.Mocked<ServiceRequestRepository>;
  let useCase: CreateServiceRequestUseCase;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-16T10:00:00.000Z'));

    serviceCatalogRepository = {
      findCategoryById: jest.fn(),
      findCategoryByCode: jest.fn(),
      saveCategory: jest.fn(),
      activeCategoryExists: jest.fn().mockResolvedValue(true),
      activeSlaPolicyExists: jest.fn(),
      findActiveSkillIds: jest.fn(),
      findServiceTypeById: jest.fn(),
      findActiveServiceTypeForRequest: jest.fn().mockResolvedValue({
        serviceType: createServiceType({ isOther: false }),
        slaPolicy: {
          id: slaPolicyId,
          assignmentDeadlineMinutes: 60,
          completionDeadlineMinutes: 240,
          isActive: true,
        },
      }),
      findServiceTypeByCategoryAndCode: jest.fn(),
      findOtherServiceTypeInCategory: jest.fn(),
      saveServiceType: jest.fn(),
    };
    customerAddressRepository = {
      create: jest.fn(),
      findByIdForCustomer: jest.fn().mockResolvedValue({
        address: CustomerAddress.rehydrate({
          id: addressId,
          customerId,
          serviceAreaId: randomUUID(),
          line1: '12 Rustaveli Avenue',
          line2: null,
          city: 'Tbilisi',
          postalCode: null,
          notes: null,
        }),
        serviceArea: {
          id: randomUUID(),
          code: 'TBILISI',
          name: 'Tbilisi',
          isActive: true,
        },
      }),
      listForCustomer: jest.fn(),
      save: jest.fn(),
    };
    serviceRequestRepository = {
      create: jest.fn(
        (input): Promise<CreatedServiceRequest> =>
          Promise.resolve({
            request: input.request,
            requiredSkillIds: input.requiredSkillIds,
            attachments: input.attachments.map((attachment) => ({
              id: randomUUID(),
              serviceRequestId: input.request.id,
              uploadedByUserId: input.actorUserId,
              fileName: attachment.fileName,
              mimeType: attachment.mimeType,
              storageKey: attachment.storageKey,
              kind: 'request_photo',
            })),
          }),
      ),
    };

    useCase = new CreateServiceRequestUseCase(
      serviceCatalogRepository,
      customerAddressRepository,
      serviceRequestRepository,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a normal request with copied service type metadata and SLA deadlines', async () => {
    const result = await useCase.execute(createCommand());

    expect(result.created.request.status).toBe('created');
    expect(result.created.request.priority).toBe(RequestPriority.High);
    expect(result.created.request.estimatedDurationMinutes).toBe(90);
    expect(result.created.request.assignmentDeadlineAt.toISOString()).toBe(
      '2026-06-16T11:00:00.000Z',
    );
    expect(result.created.request.completionDeadlineAt.toISOString()).toBe(
      '2026-06-16T14:00:00.000Z',
    );
    expect(result.created.requiredSkillIds).toEqual([skillId]);
    expect(serviceRequestRepository.create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        actorUserId: customerId,
        requiredSkillIds: [skillId],
      }),
    );
  });

  it('creates an Other service type request in needs_triage status', async () => {
    serviceCatalogRepository.findActiveServiceTypeForRequest.mockResolvedValue({
      serviceType: createServiceType({ isOther: true }),
      slaPolicy: {
        id: slaPolicyId,
        assignmentDeadlineMinutes: 120,
        completionDeadlineMinutes: 240,
        isActive: true,
      },
    });

    const result = await useCase.execute(createCommand());

    expect(result.created.request.status).toBe('needs_triage');
  });

  it('rejects preferred windows in the past', async () => {
    await expect(
      useCase.execute(
        createCommand({
          preferredStartAt: new Date('2026-06-16T09:00:00.000Z'),
          preferredEndAt: new Date('2026-06-16T12:00:00.000Z'),
        }),
      ),
    ).rejects.toBeInstanceOf(ServiceRequestPreferredWindowInPastError);

    expect(serviceRequestRepository.create.mock.calls).toHaveLength(0);
  });

  it('rejects service types from a different category', async () => {
    serviceCatalogRepository.findActiveServiceTypeForRequest.mockResolvedValue({
      serviceType: createServiceType({ categoryId: randomUUID() }),
      slaPolicy: {
        id: slaPolicyId,
        assignmentDeadlineMinutes: 60,
        completionDeadlineMinutes: 240,
        isActive: true,
      },
    });

    await expect(useCase.execute(createCommand())).rejects.toBeInstanceOf(
      ServiceRequestServiceTypeCategoryMismatchError,
    );
  });

  it('rejects addresses not owned by the customer', async () => {
    customerAddressRepository.findByIdForCustomer.mockResolvedValue(null);

    await expect(useCase.execute(createCommand())).rejects.toBeInstanceOf(
      ServiceRequestAddressNotFoundError,
    );
  });

  const createCommand = (
    overrides: Partial<Parameters<CreateServiceRequestUseCase['execute']>[0]> = {},
  ): Parameters<CreateServiceRequestUseCase['execute']>[0] => ({
    customerId,
    categoryId,
    serviceTypeId,
    addressId,
    description: 'AC does not cool.',
    preferredStartAt: new Date('2026-06-17T10:00:00.000Z'),
    preferredEndAt: new Date('2026-06-17T14:00:00.000Z'),
    attachments: [
      {
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        storageKey: 'uploads/photo.jpg',
      },
    ],
    ...overrides,
  });

  const createServiceType = (
    overrides: Partial<{
      categoryId: string;
      isOther: boolean;
    }> = {},
  ): ServiceType =>
    ServiceType.rehydrate({
      id: serviceTypeId,
      categoryId: overrides.categoryId ?? categoryId,
      slaPolicyId,
      code: overrides.isOther ? 'OTHER' : 'AC_LEAKING',
      name: overrides.isOther ? 'Other HVAC issue' : 'AC leaking',
      description: null,
      defaultPriority: RequestPriority.High,
      estimatedDurationMinutes: 90,
      isOther: overrides.isOther ?? false,
      isActive: true,
      requiredSkillIds: [skillId],
    });
});
