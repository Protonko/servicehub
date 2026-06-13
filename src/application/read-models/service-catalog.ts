export interface ServiceCategorySummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface ServiceCatalogSlaPolicySummary {
  id: string;
  code: string;
  name: string;
}

export interface ServiceCatalogSkillSummary {
  id: string;
  code: string;
  name: string;
}

export interface ServiceTypeSummary {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  description: string | null;
  defaultPriority: string;
  estimatedDurationMinutes: number;
  isOther: boolean;
  slaPolicy: ServiceCatalogSlaPolicySummary;
  requiredSkills: ServiceCatalogSkillSummary[];
}
