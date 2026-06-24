import { Inject, Injectable } from '@nestjs/common';

import {
  TECHNICIAN_MANAGEMENT_READ_QUERY,
  TechnicianManagementReadQuery,
} from '@application/queries/technician-management-read.query';
import { TechnicianManagementListItem } from '@application/read-models';

export interface ListTechniciansResult {
  technicians: TechnicianManagementListItem[];
}

@Injectable()
export class ListTechniciansUseCase {
  constructor(
    @Inject(TECHNICIAN_MANAGEMENT_READ_QUERY)
    private readonly technicianManagementReadQuery: TechnicianManagementReadQuery,
  ) {}

  async execute(): Promise<ListTechniciansResult> {
    return { technicians: await this.technicianManagementReadQuery.listTechnicians() };
  }
}
