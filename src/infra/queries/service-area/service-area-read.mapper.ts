import { ServiceAreaSummary } from '@application/read-models';

import { ServiceAreaRow } from './service-area-read.types';

export class ServiceAreaReadMapper {
  static toSummary(row: ServiceAreaRow): ServiceAreaSummary {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
    };
  }
}
