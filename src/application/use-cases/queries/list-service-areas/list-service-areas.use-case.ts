import { Inject, Injectable } from '@nestjs/common';

import {
  SERVICE_AREA_READ_QUERY,
  ServiceAreaReadQuery,
} from '@application/queries/service-area-read.query';
import { ServiceAreaSummary } from '@application/read-models';

export interface ListServiceAreasResult {
  serviceAreas: ServiceAreaSummary[];
}

@Injectable()
export class ListServiceAreasUseCase {
  constructor(
    @Inject(SERVICE_AREA_READ_QUERY)
    private readonly serviceAreaReadQuery: ServiceAreaReadQuery,
  ) {}

  async execute(): Promise<ListServiceAreasResult> {
    const serviceAreas = await this.serviceAreaReadQuery.listActiveServiceAreas();

    return { serviceAreas };
  }
}
