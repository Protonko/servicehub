import { TechnicianStatus } from '@domain/model';

export interface TechnicianManagementSkillSummary {
  id: string;
  code: string;
  name: string;
}

export interface TechnicianManagementServiceAreaSummary {
  id: string;
  code: string;
  name: string;
}

export interface TechnicianManagementListItem {
  id: string;
  user: {
    id: string;
    email: string;
    fullName: string;
  };
  status: TechnicianStatus;
  dailyAssignmentLimit: number;
  rating: number | null;
  skills: TechnicianManagementSkillSummary[];
  serviceAreas: TechnicianManagementServiceAreaSummary[];
  createdAt: Date;
  updatedAt: Date;
}
