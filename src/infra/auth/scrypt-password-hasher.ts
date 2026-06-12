import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { Injectable } from '@nestjs/common';

import { PasswordHasher } from '@contract/auth';

const scrypt = promisify(scryptCallback);
const keyLength = 64;

@Injectable()
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('base64url');
    const derivedKey = (await scrypt(password, salt, keyLength)) as Buffer;

    return `scrypt$${salt}$${derivedKey.toString('base64url')}`;
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    const [algorithm, salt, expectedHash] = passwordHash.split('$');

    if (algorithm !== 'scrypt' || !salt || !expectedHash) {
      return false;
    }

    const actualHash = (await scrypt(password, salt, keyLength)) as Buffer;
    const expected = Buffer.from(expectedHash, 'base64url');

    return expected.length === actualHash.length && timingSafeEqual(expected, actualHash);
  }
}
