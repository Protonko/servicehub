import { RequestPriority } from '@domain/model';

import { ServiceCatalogReadMapper } from '../service-catalog-read.mapper';
import { ServiceTypeRow } from '../service-catalog-read.types';

describe('ServiceCatalogReadMapper', () => {
  it('aggregates joined skill rows and converts database numeric values', () => {
    const rows: ServiceTypeRow[] = [
      createServiceTypeRow({
        skillId: 'skill-1',
        skillCode: 'HVAC_REPAIR',
        skillName: 'HVAC Repair',
      }),
      createServiceTypeRow({
        skillId: 'skill-2',
        skillCode: 'ELECTRICAL_SAFETY',
        skillName: 'Electrical Safety',
      }),
      createServiceTypeRow({
        serviceTypeId: 'service-type-2',
        code: 'HVAC_OTHER',
        name: 'Other',
        isOther: true,
      }),
    ];

    expect(ServiceCatalogReadMapper.toServiceTypes(rows)).toEqual([
      expect.objectContaining({
        id: 'service-type-1',
        estimatedDurationMinutes: 90,
        requiredSkills: [
          { id: 'skill-1', code: 'HVAC_REPAIR', name: 'HVAC Repair' },
          { id: 'skill-2', code: 'ELECTRICAL_SAFETY', name: 'Electrical Safety' },
        ],
      }),
      expect.objectContaining({
        id: 'service-type-2',
        isOther: true,
        requiredSkills: [],
      }),
    ]);
  });
});

function createServiceTypeRow(overrides: Partial<ServiceTypeRow>): ServiceTypeRow {
  return {
    serviceTypeId: 'service-type-1',
    categoryId: 'category-1',
    code: 'AC_NOT_COOLING',
    name: 'Air conditioner does not cool',
    description: null,
    defaultPriority: RequestPriority.Normal,
    estimatedDurationMinutes: '90' as unknown as number,
    isOther: false,
    slaPolicyId: 'sla-policy-1',
    slaPolicyCode: 'STANDARD_24H',
    slaPolicyName: 'Standard 24 Hour Response',
    skillId: null,
    skillCode: null,
    skillName: null,
    ...overrides,
  };
}
