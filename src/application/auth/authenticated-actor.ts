import { RoleCode } from '@domain/model';

export interface AuthenticatedActor {
  userId: string;
  roles: RoleCode[];
}
