import { DispatcherQueueForbiddenError } from '@application/errors';
import { DispatcherQueueReadQuery } from '@application/queries/dispatcher-queue-read.query';
import { DispatcherQueueItem, DispatcherQueueSlaState } from '@application/read-models';
import { RequestPriority, RoleCode, ServiceRequestStatus } from '@domain/model';

import { GetDispatcherQueueUseCase } from '../get-dispatcher-queue.use-case';

describe('GetDispatcherQueueUseCase', () => {
  const request = createQueueItem();
  const search = jest.fn();
  let readQuery: jest.Mocked<DispatcherQueueReadQuery>;
  let useCase: GetDispatcherQueueUseCase;

  beforeEach(() => {
    search.mockReset().mockResolvedValue({ items: [request], total: 3 });
    readQuery = { search };
    useCase = new GetDispatcherQueueUseCase(readQuery);
  });

  it.each([RoleCode.Dispatcher, RoleCode.Admin])(
    'allows %s and forwards filters and pagination',
    async (role) => {
      const criteria = {
        priority: RequestPriority.Urgent,
        slaState: DispatcherQueueSlaState.AtRisk,
      };
      const pagination = { limit: 10, offset: 20 };

      const result = await useCase.execute({
        actor: { userId: 'operations-user', roles: [role] },
        criteria,
        pagination,
      });

      expect(search).toHaveBeenCalledWith(criteria, pagination);
      expect(result).toEqual({ requests: [request], total: 3, limit: 10, offset: 20 });
    },
  );

  it.each([RoleCode.Customer, RoleCode.Technician])(
    'rejects an actor with only the %s role before querying',
    async (role) => {
      await expect(
        useCase.execute({
          actor: { userId: 'unsupported-user', roles: [role] },
          criteria: {},
          pagination: { limit: 20, offset: 0 },
        }),
      ).rejects.toBeInstanceOf(DispatcherQueueForbiddenError);

      expect(search).not.toHaveBeenCalled();
    },
  );
});

function createQueueItem(): DispatcherQueueItem {
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
    serviceArea: { id: 'area-id', code: 'CENTRAL', name: 'Central' },
    status: ServiceRequestStatus.Created,
    priority: RequestPriority.Urgent,
    slaState: DispatcherQueueSlaState.AtRisk,
    relevantDeadlineAt: now,
    preferredStartAt: now,
    preferredEndAt: now,
    assignmentDeadlineAt: now,
    completionDeadlineAt: now,
    createdAt: now,
    updatedAt: now,
  };
}
