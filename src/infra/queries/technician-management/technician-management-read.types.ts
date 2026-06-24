import { TechnicianStatus } from '@domain/model';

export interface TechnicianManagementRelationRow {
  id: string;
  code: string;
  name: string;
}

export interface TechnicianManagementRow {
  id: string;
  userId: string;
  userEmail: string;
  userFullName: string;
  status: TechnicianStatus;
  dailyAssignmentLimit: number;
  rating: string | null;
  skills: TechnicianManagementRelationRow[];
  serviceAreas: TechnicianManagementRelationRow[];
  createdAt: Date;
  updatedAt: Date;
}
