import {
  EmptyTechnicianUpdateError,
  TechnicianServiceAreaNotFoundError,
  TechnicianSkillNotFoundError,
  TechnicianUserNotFoundError,
} from '@application/errors';
import { DuplicateTechnicianProfileError } from '@domain/exceptions';
import { ServiceAreaReadQuery } from '@application/queries/service-area-read.query';
import { TechnicianManagementReadQuery } from '@application/queries/technician-management-read.query';
import {
  ServiceCatalogAdminRepository,
  TechnicianRepository,
  UserRepository,
} from '@domain/repositories';
import { RoleCode, Technician, TechnicianStatus, User } from '@domain/model';

import { CreateTechnicianUseCase } from '../create-technician/create-technician.use-case';
import { UpdateTechnicianUseCase } from '../update-technician/update-technician.use-case';
import { ListTechniciansUseCase } from '../../queries/list-technicians/list-technicians.use-case';

describe('Technician management use cases', () => {
  const user = User.rehydrate({
    id: 'user-id',
    email: 'technician@example.com',
    passwordHash: 'hash',
    fullName: 'Technician User',
    phone: null,
    isActive: true,
    roleCodes: [RoleCode.Technician],
  });

  const technician = Technician.rehydrate({
    id: 'technician-id',
    userId: user.id,
    status: TechnicianStatus.Active,
    dailyAssignmentLimit: 4,
    rating: null,
    skillIds: ['skill-id'],
    serviceAreaIds: ['service-area-id'],
  });

  const createTechnicianRepository = () =>
    ({
      save: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
    }) as jest.Mocked<TechnicianRepository>;

  const createUserRepository = () =>
    ({
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
    }) as jest.Mocked<UserRepository>;

  const createCatalogRepository = () =>
    ({
      findActiveSkillIds: jest.fn(),
    }) as unknown as jest.Mocked<ServiceCatalogAdminRepository>;

  const createServiceAreaReadQuery = () =>
    ({
      findActiveServiceAreaIds: jest.fn(),
    }) as unknown as jest.Mocked<ServiceAreaReadQuery>;

  const createUseCase = () => {
    const userRepository = createUserRepository();
    const technicianRepository = createTechnicianRepository();
    const catalogRepository = createCatalogRepository();
    const serviceAreaReadQuery = createServiceAreaReadQuery();

    return {
      useCase: new CreateTechnicianUseCase(
        userRepository,
        technicianRepository,
        catalogRepository,
        serviceAreaReadQuery,
      ),
      userRepository,
      technicianRepository,
      catalogRepository,
      serviceAreaReadQuery,
    };
  };

  it('creates a technician after validating the active user and references', async () => {
    const dependencies = createUseCase();
    dependencies.userRepository.findById.mockResolvedValue(user);
    dependencies.technicianRepository.findByUserId.mockResolvedValue(null);
    dependencies.catalogRepository.findActiveSkillIds.mockResolvedValue(['skill-id']);
    dependencies.serviceAreaReadQuery.findActiveServiceAreaIds.mockResolvedValue([
      'service-area-id',
    ]);
    dependencies.technicianRepository.save.mockImplementation((value) => Promise.resolve(value));

    const result = await dependencies.useCase.execute({
      userId: user.id,
      dailyAssignmentLimit: 4,
      skillIds: ['skill-id', 'skill-id'],
      serviceAreaIds: ['service-area-id', 'service-area-id'],
    });

    expect(result.technician.skillIds).toEqual(['skill-id']);
    expect(result.technician.serviceAreaIds).toEqual(['service-area-id']);
    expect(dependencies.technicianRepository.save.mock.calls).toHaveLength(1);
  });

  it('rejects a missing user and duplicate profile', async () => {
    const missingUser = createUseCase();
    missingUser.userRepository.findById.mockResolvedValue(null);
    missingUser.technicianRepository.findByUserId.mockResolvedValue(null);
    missingUser.catalogRepository.findActiveSkillIds.mockResolvedValue(['skill-id']);
    missingUser.serviceAreaReadQuery.findActiveServiceAreaIds.mockResolvedValue([
      'service-area-id',
    ]);

    await expect(
      missingUser.useCase.execute({
        userId: user.id,
        dailyAssignmentLimit: 4,
        skillIds: ['skill-id'],
        serviceAreaIds: ['service-area-id'],
      }),
    ).rejects.toBeInstanceOf(TechnicianUserNotFoundError);

    const duplicate = createUseCase();
    duplicate.userRepository.findById.mockResolvedValue(user);
    duplicate.technicianRepository.findByUserId.mockResolvedValue(technician);
    duplicate.catalogRepository.findActiveSkillIds.mockResolvedValue(['skill-id']);
    duplicate.serviceAreaReadQuery.findActiveServiceAreaIds.mockResolvedValue(['service-area-id']);

    await expect(
      duplicate.useCase.execute({
        userId: user.id,
        dailyAssignmentLimit: 4,
        skillIds: ['skill-id'],
        serviceAreaIds: ['service-area-id'],
      }),
    ).rejects.toBeInstanceOf(DuplicateTechnicianProfileError);
  });

  it('rejects inactive or missing skill and service-area references', async () => {
    const inactiveSkill = createUseCase();
    inactiveSkill.userRepository.findById.mockResolvedValue(user);
    inactiveSkill.technicianRepository.findByUserId.mockResolvedValue(null);
    inactiveSkill.catalogRepository.findActiveSkillIds.mockResolvedValue([]);
    inactiveSkill.serviceAreaReadQuery.findActiveServiceAreaIds.mockResolvedValue([
      'service-area-id',
    ]);

    await expect(
      inactiveSkill.useCase.execute({
        userId: user.id,
        dailyAssignmentLimit: 4,
        skillIds: ['skill-id'],
        serviceAreaIds: ['service-area-id'],
      }),
    ).rejects.toBeInstanceOf(TechnicianSkillNotFoundError);

    const inactiveArea = createUseCase();
    inactiveArea.userRepository.findById.mockResolvedValue(user);
    inactiveArea.technicianRepository.findByUserId.mockResolvedValue(null);
    inactiveArea.catalogRepository.findActiveSkillIds.mockResolvedValue(['skill-id']);
    inactiveArea.serviceAreaReadQuery.findActiveServiceAreaIds.mockResolvedValue([]);

    await expect(
      inactiveArea.useCase.execute({
        userId: user.id,
        dailyAssignmentLimit: 4,
        skillIds: ['skill-id'],
        serviceAreaIds: ['service-area-id'],
      }),
    ).rejects.toBeInstanceOf(TechnicianServiceAreaNotFoundError);
  });

  it('updates supplied fields while preserving omitted fields', async () => {
    const technicianRepository = createTechnicianRepository();
    const catalogRepository = createCatalogRepository();
    const serviceAreaReadQuery = createServiceAreaReadQuery();
    technicianRepository.findById.mockResolvedValue(technician);
    technicianRepository.save.mockImplementation((value) => Promise.resolve(value));
    serviceAreaReadQuery.findActiveServiceAreaIds.mockResolvedValue(['new-area-id']);
    const useCase = new UpdateTechnicianUseCase(
      technicianRepository,
      catalogRepository,
      serviceAreaReadQuery,
    );

    const result = await useCase.execute({
      technicianId: technician.id,
      status: TechnicianStatus.OnLeave,
      serviceAreaIds: ['new-area-id'],
    });

    expect(result.technician.status).toBe(TechnicianStatus.OnLeave);
    expect(result.technician.dailyAssignmentLimit).toBe(4);
    expect(result.technician.skillIds).toEqual(['skill-id']);
    expect(result.technician.serviceAreaIds).toEqual(['new-area-id']);
    expect(catalogRepository.findActiveSkillIds.mock.calls).toHaveLength(0);
  });

  it('rejects an empty update before loading the technician', async () => {
    const technicianRepository = createTechnicianRepository();
    const useCase = new UpdateTechnicianUseCase(
      technicianRepository,
      createCatalogRepository(),
      createServiceAreaReadQuery(),
    );

    await expect(useCase.execute({ technicianId: technician.id })).rejects.toBeInstanceOf(
      EmptyTechnicianUpdateError,
    );
    expect(technicianRepository.findById.mock.calls).toHaveLength(0);
  });

  it('delegates technician listing to the management read query', async () => {
    const readQuery = {
      listTechnicians: jest.fn().mockResolvedValue([]),
    } as jest.Mocked<TechnicianManagementReadQuery>;
    const useCase = new ListTechniciansUseCase(readQuery);

    await expect(useCase.execute()).resolves.toEqual({ technicians: [] });
    expect(readQuery.listTechnicians.mock.calls).toHaveLength(1);
  });
});
