import { ServiceRequestReadForbiddenError } from '@application/errors';
import { ServiceRequestReadQuery } from '@application/queries/service-request-read.query';
import { ServiceRequestSummary } from '@application/read-models';
import { RequestPriority, RoleCode, ServiceRequestStatus } from '@domain/model';
import { SearchServiceRequestsUseCase } from '../search-service-requests.use-case';

describe('SearchServiceRequestsUseCase', () => {
  const request = createRequestSummary();
  const search = jest.fn();
  let readQuery: jest.Mocked<ServiceRequestReadQuery>;
  let useCase: SearchServiceRequestsUseCase;

  beforeEach(() => {
    search.mockReset().mockResolvedValue({ items: [request], total: 1 });
    readQuery = {
      search,
      findById: jest.fn(),
    };
    useCase = new SearchServiceRequestsUseCase(readQuery);
  });

  it('scopes customer searches to the actor user id and forwards filters and pagination', async () => {
    const criteria = {
      status: ServiceRequestStatus.Created,
      priority: RequestPriority.High,
    };
    const pagination = { limit: 10, offset: 20 };

    const result = await useCase.execute({
      actor: { userId: 'customer-id', roles: [RoleCode.Customer] },
      criteria,
      pagination,
    });

    expect(search).toHaveBeenCalledWith(
      criteria,
      { kind: 'customer', customerId: 'customer-id' },
      pagination,
    );
    expect(result).toEqual({ requests: [request], total: 1, limit: 10, offset: 20 });
  });

  it.each([RoleCode.Dispatcher, RoleCode.Admin])(
    'uses all-request visibility for %s',
    async (role) => {
      await useCase.execute({
        actor: { userId: 'operations-user', roles: [role] },
        criteria: {},
        pagination: { limit: 20, offset: 0 },
      });

      expect(search).toHaveBeenCalledWith({}, { kind: 'all' }, { limit: 20, offset: 0 });
    },
  );

  it('gives all-request visibility to an actor with both customer and dispatcher roles', async () => {
    await useCase.execute({
      actor: {
        userId: 'operations-user',
        roles: [RoleCode.Customer, RoleCode.Dispatcher],
      },
      criteria: {},
      pagination: { limit: 20, offset: 0 },
    });

    expect(search).toHaveBeenCalledWith({}, { kind: 'all' }, { limit: 20, offset: 0 });
  });

  it('rejects an actor without a supported read role', async () => {
    await expect(
      useCase.execute({
        actor: { userId: 'technician-id', roles: [RoleCode.Technician] },
        criteria: {},
        pagination: { limit: 20, offset: 0 },
      }),
    ).rejects.toBeInstanceOf(ServiceRequestReadForbiddenError);

    expect(search).not.toHaveBeenCalled();
  });
});

function createRequestSummary(): ServiceRequestSummary {
  const now = new Date('2026-06-20T10:00:00.000Z');

  return {
    id: 'request-id',
    customer: { id: 'customer-id', fullName: 'Customer' },
    category: { id: 'category-id', code: 'HVAC', name: 'HVAC' },
    serviceType: {
      id: 'service-type-id',
      code: 'AC_REPAIR',
      name: 'AC repair',
      isOther: false,
    },
    address: { id: 'address-id', city: 'Tbilisi', line1: '12 Rustaveli Avenue' },
    status: ServiceRequestStatus.Created,
    priority: RequestPriority.High,
    preferredStartAt: now,
    preferredEndAt: now,
    assignmentDeadlineAt: now,
    completionDeadlineAt: now,
    createdAt: now,
    updatedAt: now,
  };
}
