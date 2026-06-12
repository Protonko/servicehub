import { RoleCode } from '../role-code';

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string | null;
  isActive: boolean;
  roleCodes: RoleCode[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  fullName: string;
  phone?: string | null;
  roleCodes: RoleCode[];
}
