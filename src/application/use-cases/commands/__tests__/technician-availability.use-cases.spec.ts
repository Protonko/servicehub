import { TechnicianCalendarForbiddenError, TechnicianNotFoundError } from '@application/errors';
import { TechnicianCalendarReadQuery } from '@application/queries/technician-calendar-read.query';
import {
  RoleCode,
  Technician,
  TechnicianAvailabilityWindow,
  TechnicianStatus,
} from '@domain/model';
import { TechnicianAvailabilityRepository, TechnicianRepository } from '@domain/repositories';

import { CreateTechnicianAvailabilityWindowUseCase } from '../create-technician-availability-window/create-technician-availability-window.use-case';
import { GetTechnicianCalendarUseCase } from '../../queries/get-technician-calendar/get-technician-calendar.use-case';

describe('Technician availability use cases', () => {
  const technician = Technician.rehydrate({
    id: 'technician-id',
    userId: 'technician-user-id',
    status: TechnicianStatus.Active,
    dailyAssignmentLimit: 4,
    rating: null,
    skillIds: [],
    serviceAreaIds: ['area-id'],
  });
  const availabilityWindow = TechnicianAvailabilityWindow.rehydrate({
    id: 'window-id',
    technicianId: technician.id,
    startsAt: new Date('2026-07-01T09:00:00.000Z'),
    endsAt: new Date('2026-07-01T17:00:00.000Z'),
    isAvailable: true,
    reason: null,
    createdAt: new Date('2026-06-24T10:00:00.000Z'),
    updatedAt: new Date('2026-06-24T10:00:00.000Z'),
  });

  const createTechnicianRepository = () =>
    ({
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
    }) as jest.Mocked<TechnicianRepository>;

  it('creates a window for an existing technician', async () => {
    const technicianRepository = createTechnicianRepository();
    const availabilityRepository = {
      save: jest.fn().mockResolvedValue(availabilityWindow),
    } as jest.Mocked<TechnicianAvailabilityRepository>;
    technicianRepository.findById.mockResolvedValue(technician);
    const useCase = new CreateTechnicianAvailabilityWindowUseCase(
      technicianRepository,
      availabilityRepository,
    );

    await expect(
      useCase.execute({
        technicianId: technician.id,
        startsAt: availabilityWindow.startsAt,
        endsAt: availabilityWindow.endsAt,
        isAvailable: true,
      }),
    ).resolves.toEqual({ availabilityWindow });
    expect(availabilityRepository.save.mock.calls).toHaveLength(1);
  });

  it('rejects availability creation for a missing technician', async () => {
    const technicianRepository = createTechnicianRepository();
    technicianRepository.findById.mockResolvedValue(null);
    const availabilityRepository = {
      save: jest.fn(),
    } as jest.Mocked<TechnicianAvailabilityRepository>;
    const useCase = new CreateTechnicianAvailabilityWindowUseCase(
      technicianRepository,
      availabilityRepository,
    );

    await expect(
      useCase.execute({
        technicianId: technician.id,
        startsAt: availabilityWindow.startsAt,
        endsAt: availabilityWindow.endsAt,
        isAvailable: true,
      }),
    ).rejects.toBeInstanceOf(TechnicianNotFoundError);
    expect(availabilityRepository.save.mock.calls).toHaveLength(0);
  });

  it.each([RoleCode.Admin, RoleCode.Dispatcher])(
    'allows %s to read any technician calendar',
    async (role) => {
      const technicianRepository = createTechnicianRepository();
      const readQuery = createCalendarReadQuery();
      technicianRepository.findById.mockResolvedValue(technician);
      const useCase = new GetTechnicianCalendarUseCase(technicianRepository, readQuery);

      await expect(
        useCase.execute({
          actor: { userId: 'another-user-id', roles: [role] },
          technicianId: technician.id,
        }),
      ).resolves.toEqual({
        calendar: {
          technicianId: technician.id,
          availabilityWindows: [expect.objectContaining({ id: availabilityWindow.id })],
        },
      });
    },
  );

  it('allows a technician to read their own calendar and rejects another profile', async () => {
    const technicianRepository = createTechnicianRepository();
    const readQuery = createCalendarReadQuery();
    technicianRepository.findById.mockResolvedValue(technician);
    const useCase = new GetTechnicianCalendarUseCase(technicianRepository, readQuery);

    await expect(
      useCase.execute({
        actor: { userId: technician.userId, roles: [RoleCode.Technician] },
        technicianId: technician.id,
      }),
    ).resolves.toEqual(expect.objectContaining({ calendar: expect.any(Object) }));

    await expect(
      useCase.execute({
        actor: { userId: 'another-user-id', roles: [RoleCode.Technician] },
        technicianId: technician.id,
      }),
    ).rejects.toBeInstanceOf(TechnicianCalendarForbiddenError);
  });

  const createCalendarReadQuery = () =>
    ({
      listAvailabilityWindows: jest.fn().mockResolvedValue([
        {
          id: availabilityWindow.id,
          technicianId: availabilityWindow.technicianId,
          startsAt: availabilityWindow.startsAt,
          endsAt: availabilityWindow.endsAt,
          isAvailable: availabilityWindow.isAvailable,
          reason: availabilityWindow.reason,
          createdAt: availabilityWindow.createdAt,
          updatedAt: availabilityWindow.updatedAt,
        },
      ]),
    }) as jest.Mocked<TechnicianCalendarReadQuery>;
});
