import { RoleCode } from '@domain/model';
import { User } from '@domain/model';

export interface AuthUserSummary {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  roles: RoleCode[];
}

export const toAuthUserSummary = (user: User): AuthUserSummary => ({
  id: user.id,
  email: user.email,
  fullName: user.fullName,
  phone: user.phone,
  roles: user.roleCodes,
});
