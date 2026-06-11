import { randomUUID } from 'node:crypto';

import { MigrationInterface, QueryRunner } from 'typeorm';

const roleRows = [
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

export class RoleSeedData1781160001000 implements MigrationInterface {
  name = 'RoleSeedData1781160001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE roles (
        id uuid PRIMARY KEY,
        code varchar(50) NOT NULL,
        name varchar(100) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_roles_code CHECK (code IN ('customer', 'dispatcher', 'technician', 'admin')),
        CONSTRAINT chk_roles_name_not_blank CHECK (length(btrim(name)) > 0)
      )
    `);

    await queryRunner.query('CREATE UNIQUE INDEX idx_roles_code ON roles (code)');

    for (const role of roleRows) {
      await queryRunner.query(
        `
          INSERT INTO roles (id, code, name)
          VALUES ($1, $2, $3)
          ON CONFLICT (code) DO UPDATE
          SET name = EXCLUDED.name
        `,
        [randomUUID(), role.code, role.name],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_roles_code');
    await queryRunner.query('DROP TABLE IF EXISTS roles');
  }
}
