import { QueryRunner } from 'typeorm';

import { UserPersistence1781160002000 } from '../../migrations/1781160002000-UserPersistence';

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

describe('UserPersistence migration', () => {
  it('creates users with required constraints and indexes', async () => {
    const migration = new UserPersistence1781160002000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.up(queryRunner);

    const sql = queries.join('\n');

    expect(sql).toContain('CREATE TABLE users');
    expect(sql).toContain('id uuid PRIMARY KEY');
    expect(sql).toContain('email varchar(320) NOT NULL');
    expect(sql).toContain('password_hash varchar NOT NULL');
    expect(sql).toContain('full_name varchar(200) NOT NULL');
    expect(sql).toContain('is_active boolean NOT NULL DEFAULT true');
    expect(sql).toContain('CONSTRAINT chk_users_email_not_blank');
    expect(sql).toContain('CONSTRAINT chk_users_email_lowercase CHECK (email = lower(email))');
    expect(sql).toContain('CONSTRAINT chk_users_password_hash_not_blank');
    expect(sql).toContain('CONSTRAINT chk_users_full_name_not_blank');
    expect(sql).toContain('CREATE UNIQUE INDEX idx_users_email ON users (email)');
    expect(sql).toContain('CREATE INDEX idx_users_is_active ON users (is_active)');
  });

  it('creates user_roles with composite primary key and foreign keys', async () => {
    const migration = new UserPersistence1781160002000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.up(queryRunner);

    const sql = queries.join('\n');

    expect(sql).toContain('CREATE TABLE user_roles');
    expect(sql).toContain('CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id)');
    expect(sql).toContain(
      'CONSTRAINT fk_user_roles_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    );
    expect(sql).toContain(
      'CONSTRAINT fk_user_roles_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT',
    );
    expect(sql).toContain('CREATE INDEX idx_user_roles_user_id ON user_roles (user_id)');
    expect(sql).toContain('CREATE INDEX idx_user_roles_role_id ON user_roles (role_id)');
  });

  it('drops user schema in dependency order on revert', async () => {
    const migration = new UserPersistence1781160002000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.down(queryRunner);

    expect(queries).toEqual([
      'DROP INDEX IF EXISTS idx_user_roles_role_id',
      'DROP INDEX IF EXISTS idx_user_roles_user_id',
      'DROP TABLE IF EXISTS user_roles',
      'DROP INDEX IF EXISTS idx_users_is_active',
      'DROP INDEX IF EXISTS idx_users_email',
      'DROP TABLE IF EXISTS users',
    ]);
  });
});
