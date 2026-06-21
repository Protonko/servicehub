import { ServiceRequestNotFoundError, ServiceRequestReadForbiddenError } from '@application/errors';
import { ServiceRequestReadQuery } from '@application/queries/service-request-read.query';
import { ServiceRequestDetail } from '@application/read-models';
import { RequestPriority, RoleCode, ServiceRequestStatus } from '@domain/model';
import { GetServiceRequestUseCase } from '../get-service-request.use-case';

describe('GetServiceRequestUseCase', () => {
  const request = createRequestDetail();
  const findById = jest.fn();
  let readQuery: jest.Mocked<ServiceRequestReadQuery>;
  let useCase: GetServiceRequestUseCase;

  beforeEach(() => {
    findById.mockReset().mockResolvedValue(request);
    readQuery = {
      search: jest.fn(),
      findById,
    };
    useCase = new GetServiceRequestUseCase(readQuery);
  });

  it('uses owner visibility for a customer lookup', async () => {
    await expect(
      useCase.execute({
        actor: { userId: 'customer-id', roles: [RoleCode.Customer] },
        requestId: 'request-id',
      }),
    ).resolves.toEqual({ request });

    expect(findById).toHaveBeenCalledWith('request-id', {
      kind: 'customer',
      customerId: 'customer-id',
    });
  });

  it.each([RoleCode.Dispatcher, RoleCode.Admin])(
    'uses all-request visibility for %s',
    async (role) => {
      await useCase.execute({
        actor: { userId: 'operations-user', roles: [role] },
        requestId: 'request-id',
      });

      expect(findById).toHaveBeenCalledWith('request-id', { kind: 'all' });
    },
  );

  it('returns not found when the scoped query cannot see the request', async () => {
    findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        actor: { userId: 'customer-id', roles: [RoleCode.Customer] },
        requestId: 'another-request-id',
      }),
    ).rejects.toBeInstanceOf(ServiceRequestNotFoundError);
  });

  it('rejects an actor without a supported read role before querying', async () => {
    await expect(
      useCase.execute({
        actor: { userId: 'technician-id', roles: [RoleCode.Technician] },
        requestId: 'request-id',
      }),
    ).rejects.toBeInstanceOf(ServiceRequestReadForbiddenError);

    expect(findById).not.toHaveBeenCalled();
  });
});

function createRequestDetail(): ServiceRequestDetail {
  const now = new Date('2026-06-20T10:00:00.000Z');

  return {
    id: 'request-id',
    customer: {
      id: 'customer-id',
      fullName: 'Customer',
      email: 'customer@example.com',
      phone: null,
    },
    category: { id: 'category-id', code: 'HVAC', name: 'HVAC' },
    serviceType: {
      id: 'service-type-id',
      code: 'AC_REPAIR',
      name: 'AC repair',
      isOther: false,
    },
    address: {
      id: 'address-id',
      serviceArea: { id: 'area-id', code: 'TBILISI', name: 'Tbilisi' },
      line1: '12 Rustaveli Avenue',
      line2: null,
      city: 'Tbilisi',
      postalCode: null,
      notes: null,
    },
    slaPolicy: { id: 'sla-id', code: 'STANDARD', name: 'Standard' },
    status: ServiceRequestStatus.Created,
    priority: RequestPriority.High,
    description: 'AC is not cooling.',
    additionalContactInstructions: null,
    preferredStartAt: now,
    preferredEndAt: now,
    estimatedDurationMinutes: 90,
    assignmentDeadlineAt: now,
    completionDeadlineAt: now,
    triagedAt: null,
    assignedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    escalatedAt: null,
    requiredSkills: [],
    attachments: [],
    createdAt: now,
    updatedAt: now,
  };
}
