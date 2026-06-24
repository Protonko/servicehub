import { TechnicianStatus } from './technician-status';

export interface TechnicianProps {
  id: string;
  userId: string;
  status: TechnicianStatus;
  dailyAssignmentLimit: number;
  rating: number | null;
  skillIds: string[];
  serviceAreaIds: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateTechnicianInput {
  userId: string;
  status?: TechnicianStatus;
  dailyAssignmentLimit: number;
  rating?: number | null;
  skillIds?: string[];
  serviceAreaIds: string[];
}

export interface UpdateTechnicianInput {
  status?: TechnicianStatus;
  dailyAssignmentLimit?: number;
  rating?: number | null;
  skillIds?: string[];
  serviceAreaIds?: string[];
}
