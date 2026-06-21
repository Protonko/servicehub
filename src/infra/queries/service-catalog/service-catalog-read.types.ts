import { RequestPriority } from '@domain/model';

export interface ServiceCategoryRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
}

export interface ServiceTypeRow {
  serviceTypeId: string;
  categoryId: string;
  code: string;
  name: string;
  description: string | null;
  defaultPriority: RequestPriority;
  estimatedDurationMinutes: number;
  isOther: boolean;
  slaPolicyId: string;
  slaPolicyCode: string;
  slaPolicyName: string;
  skillId: string | null;
  skillCode: string | null;
  skillName: string | null;
}
