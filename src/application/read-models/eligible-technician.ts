export interface EligibleTechnicianCandidate {
  technicianId: string;
  user: {
    id: string;
    fullName: string;
  };
  rating: number | null;
  dailyAssignmentLimit: number;
  skillIds: string[];
  serviceAreaIds: string[];
  activeAssignmentCount: number;
}

export interface EligibleTechnicianSearchResult {
  requestId: string;
  startsAt: Date;
  endsAt: Date;
  candidates: EligibleTechnicianCandidate[];
}
