import { ServiceRequestReadForbiddenError } from '@application/errors';
import { RoleCode } from '@domain/model';

import { AuthenticatedActor } from './authenticated-actor';

export type ServiceRequestReadScope =
  | { kind: 'customer'; customerId: string }
  | { kind: 'all' };

export const resolveServiceRequestReadScope = (
  actor: AuthenticatedActor,
): ServiceRequestReadScope => {
  if (actor.roles.includes(RoleCode.Admin) || actor.roles.includes(RoleCode.Dispatcher)) {
    return { kind: 'all' };
  }

  if (actor.roles.includes(RoleCode.Customer)) {
    return { kind: 'customer', customerId: actor.userId };
  }

  throw new ServiceRequestReadForbiddenError();
};
