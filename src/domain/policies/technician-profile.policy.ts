import { InactiveTechnicianUserError } from '../exceptions';
import { User } from '../model';

export class TechnicianProfilePolicy {
  static assertUserIsActive(user: User): void {
    if (!user.isActive) {
      throw new InactiveTechnicianUserError();
    }
  }
}
