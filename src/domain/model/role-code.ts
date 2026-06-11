export enum RoleCode {
  Customer = 'customer',
  Dispatcher = 'dispatcher',
  Technician = 'technician',
  Admin = 'admin',
}

export const ROLE_CODES = Object.values(RoleCode);

export const isRoleCode = (value: string): value is RoleCode =>
  ROLE_CODES.includes(value as RoleCode);
