import { InactiveTechnicianUserError } from '@domain/exceptions';
import { RoleCode, User } from '@domain/model';
import { TechnicianProfilePolicy } from '../technician-profile.policy';

describe('TechnicianProfilePolicy', () => {
  it('allows an active user', () => {
    const user = User.create({
      email: 'technician@example.com',
      passwordHash: 'hash',
      fullName: 'Technician',
      roleCodes: [RoleCode.Technician],
    });

    expect(() => TechnicianProfilePolicy.assertUserIsActive(user)).not.toThrow();
  });

  it('rejects an inactive user', () => {
    const user = User.rehydrate({
      id: 'user-id',
      email: 'technician@example.com',
      passwordHash: 'hash',
      fullName: 'Technician',
      phone: null,
      isActive: false,
      roleCodes: [RoleCode.Technician],
    });

    expect(() => TechnicianProfilePolicy.assertUserIsActive(user)).toThrow(
      InactiveTechnicianUserError,
    );
  });
});
