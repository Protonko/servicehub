export interface EligibleTechnicianRow {
  technicianId: string;
  userId: string;
  userFullName: string;
  rating: string | null;
  dailyAssignmentLimit: number;
  skillIds: string[];
  serviceAreaIds: string[];
  activeAssignmentCount: string;
}
