import { RequestPriority } from '../request-priority';

export interface ServiceTypeProps {
  id: string;
  categoryId: string;
  slaPolicyId: string;
  code: string;
  name: string;
  description: string | null;
  defaultPriority: RequestPriority;
  estimatedDurationMinutes: number;
  isOther: boolean;
  isActive: boolean;
  requiredSkillIds: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateServiceTypeInput {
  categoryId: string;
  slaPolicyId: string;
  code: string;
  name: string;
  description?: string | null;
  defaultPriority: RequestPriority;
  estimatedDurationMinutes: number;
  isOther: boolean;
  isActive?: boolean;
  requiredSkillIds: string[];
}

export interface UpdateServiceTypeInput {
  slaPolicyId?: string;
  name?: string;
  description?: string | null;
  defaultPriority?: RequestPriority;
  estimatedDurationMinutes?: number;
  isOther?: boolean;
  isActive?: boolean;
  requiredSkillIds?: string[];
}
