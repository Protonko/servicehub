import { ServiceAreaSummary } from '@application/read-models';

export const SERVICE_AREA_READ_QUERY = Symbol('SERVICE_AREA_READ_QUERY');

export interface ServiceAreaReadQuery {
  listActiveServiceAreas(): Promise<ServiceAreaSummary[]>;
  activeServiceAreaExists(serviceAreaId: string): Promise<boolean>;
}
