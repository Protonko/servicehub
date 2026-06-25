import { TechnicianAvailabilityWindow } from '../model';

export const TECHNICIAN_AVAILABILITY_REPOSITORY = Symbol('TECHNICIAN_AVAILABILITY_REPOSITORY');

export interface TechnicianAvailabilityRepository {
  save(window: TechnicianAvailabilityWindow): Promise<TechnicianAvailabilityWindow>;
}
