export interface TechnicianCalendarAvailabilityWindow {
  id: string;
  technicianId: string;
  startsAt: Date;
  endsAt: Date;
  isAvailable: boolean;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TechnicianCalendar {
  technicianId: string;
  availabilityWindows: TechnicianCalendarAvailabilityWindow[];
}
