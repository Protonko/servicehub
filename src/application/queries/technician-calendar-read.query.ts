import { TechnicianCalendarAvailabilityWindow } from '@application/read-models';

export const TECHNICIAN_CALENDAR_READ_QUERY = Symbol('TECHNICIAN_CALENDAR_READ_QUERY');

export interface TechnicianCalendarReadQuery {
  listAvailabilityWindows(technicianId: string): Promise<TechnicianCalendarAvailabilityWindow[]>;
}
