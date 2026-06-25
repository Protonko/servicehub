export interface TechnicianAvailabilityWindowProps {
  id: string;
  technicianId: string;
  startsAt: Date;
  endsAt: Date;
  isAvailable: boolean;
  reason: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateTechnicianAvailabilityWindowInput {
  technicianId: string;
  startsAt: Date;
  endsAt: Date;
  isAvailable: boolean;
  reason?: string | null;
}
