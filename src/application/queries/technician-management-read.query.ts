import { TechnicianManagementListItem } from '@application/read-models';

export const TECHNICIAN_MANAGEMENT_READ_QUERY = Symbol('TECHNICIAN_MANAGEMENT_READ_QUERY');

export interface TechnicianManagementReadQuery {
  listTechnicians(): Promise<TechnicianManagementListItem[]>;
}
