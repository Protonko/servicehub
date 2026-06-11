import { QueryRunner } from 'typeorm';

import { RoleSeedData1781160001000 } from '../migrations/1781160001000-RoleSeedData';

const migrationRoleRows = [
  {
    code: 'customer',
    name: 'Customer',
  },
  {
    code: 'dispatcher',
    name: 'Dispatcher',
  },
  {
    code: 'technician',
    name: 'Technician',
  },
  {
    code: 'admin',
    name: 'Admin',
  },
] as const;

const createQueryRunner = () => {
  const queries: Array<{ query: string; parameters?: unknown[] }> = [];

  const queryRunner = {
    query: jest.fn((query: string, parameters?: unknown[]) => {
      queries.push({ query, parameters });
    }),
  } as unknown as QueryRunner;

  return { queryRunner, queries };
};

describe('RoleSeedData migration', () => {
  it('creates roles with canonical code and name constraints', async () => {
    const migration = new RoleSeedData1781160001000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.up(queryRunner);

    const joinedSql = queries.map(({ query }) => query).join('\n');

    expect(joinedSql).toContain('CREATE TABLE roles');
    expect(joinedSql).toContain('id uuid PRIMARY KEY');
    expect(joinedSql).toContain('code varchar(50) NOT NULL');
    expect(joinedSql).toContain('name varchar(100) NOT NULL');
    expect(joinedSql).toContain('created_at timestamptz NOT NULL DEFAULT now()');
    expect(joinedSql).toContain(
      "CONSTRAINT chk_roles_code CHECK (code IN ('customer', 'dispatcher', 'technician', 'admin'))",
    );
    expect(joinedSql).toContain('CONSTRAINT chk_roles_name_not_blank');
    expect(joinedSql).toContain('CREATE UNIQUE INDEX idx_roles_code ON roles (code)');
  });

  it('seeds each canonical role with an idempotent upsert', async () => {
    const migration = new RoleSeedData1781160001000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.up(queryRunner);

    const insertQueries = queries.filter(({ query }) => query.includes('INSERT INTO roles'));

    expect(insertQueries).toHaveLength(migrationRoleRows.length);

    for (const role of migrationRoleRows) {
      expect(insertQueries).toContainEqual(
        expect.objectContaining({
          query: expect.stringContaining('ON CONFLICT (code) DO UPDATE'),
          parameters: [expect.any(String), role.code, role.name],
        }),
      );
    }
  });

  it('drops role schema on revert', async () => {
    const migration = new RoleSeedData1781160001000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.down(queryRunner);

    expect(queries.map(({ query }) => query)).toEqual([
      'DROP INDEX IF EXISTS idx_roles_code',
      'DROP TABLE IF EXISTS roles',
    ]);
  });
});
