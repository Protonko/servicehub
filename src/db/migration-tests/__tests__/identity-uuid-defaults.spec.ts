import { QueryRunner } from 'typeorm';

import { IdentityUuidDefaults1781160004000 } from '../../migrations/1781160004000-IdentityUuidDefaults';

const createQueryRunner = () => {
  const queries: string[] = [];

  const queryRunner = {
    query: jest.fn((query: string) => {
      queries.push(query);
      return Promise.resolve();
    }),
  } as unknown as QueryRunner;

  return { queryRunner, queries };
};

describe('IdentityUuidDefaults migration', () => {
  it('adds database-generated UUID defaults to identity tables', async () => {
    const migration = new IdentityUuidDefaults1781160004000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.up(queryRunner);

    expect(queries).toEqual([
      'CREATE EXTENSION IF NOT EXISTS pgcrypto',
      'ALTER TABLE roles ALTER COLUMN id SET DEFAULT gen_random_uuid()',
      'ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid()',
    ]);
  });

  it('drops identity UUID defaults on revert', async () => {
    const migration = new IdentityUuidDefaults1781160004000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.down(queryRunner);

    expect(queries).toEqual([
      'ALTER TABLE users ALTER COLUMN id DROP DEFAULT',
      'ALTER TABLE roles ALTER COLUMN id DROP DEFAULT',
    ]);
  });
});
