import { RequestPriority } from '../../request-priority';
import { ServiceType } from '../service-type.model';

describe('ServiceType', () => {
  it('normalizes service type creation input and treats required skills as a set', () => {
    const serviceType = ServiceType.create({
      categoryId: 'category-id',
      slaPolicyId: 'sla-policy-id',
      code: ' outlet_repair ',
      name: ' Outlet repair ',
      defaultPriority: RequestPriority.Normal,
      estimatedDurationMinutes: 60,
      isOther: false,
      requiredSkillIds: ['skill-id', 'skill-id'],
    });

    expect(serviceType.code).toBe('OUTLET_REPAIR');
    expect(serviceType.name).toBe('Outlet repair');
    expect(serviceType.description).toBeNull();
    expect(serviceType.isActive).toBe(true);
    expect(serviceType.requiredSkillIds).toEqual(['skill-id']);
  });

  it('rejects non-positive estimated duration', () => {
    expect(() =>
      ServiceType.create({
        categoryId: 'category-id',
        slaPolicyId: 'sla-policy-id',
        code: 'OUTLET_REPAIR',
        name: 'Outlet repair',
        defaultPriority: RequestPriority.Normal,
        estimatedDurationMinutes: 0,
        isOther: false,
        requiredSkillIds: [],
      }),
    ).toThrow('estimatedDurationMinutes must be a positive integer');
  });

  it('updates mutable service type fields without changing identity, category, or code', () => {
    const serviceType = ServiceType.rehydrate({
      id: 'service-type-id',
      categoryId: 'category-id',
      slaPolicyId: 'sla-policy-id',
      code: 'OUTLET_REPAIR',
      name: 'Outlet repair',
      description: null,
      defaultPriority: RequestPriority.Normal,
      estimatedDurationMinutes: 60,
      isOther: false,
      isActive: true,
      requiredSkillIds: ['old-skill-id'],
    });

    const updatedServiceType = serviceType.update({
      name: ' Outlet and switch repair ',
      defaultPriority: RequestPriority.High,
      requiredSkillIds: ['new-skill-id', 'new-skill-id'],
    });

    expect(updatedServiceType.id).toBe('service-type-id');
    expect(updatedServiceType.categoryId).toBe('category-id');
    expect(updatedServiceType.code).toBe('OUTLET_REPAIR');
    expect(updatedServiceType.name).toBe('Outlet and switch repair');
    expect(updatedServiceType.defaultPriority).toBe(RequestPriority.High);
    expect(updatedServiceType.requiredSkillIds).toEqual(['new-skill-id']);
  });
});
