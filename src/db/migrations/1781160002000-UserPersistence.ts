import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserPersistence1781160002000 implements MigrationInterface {
  name = 'UserPersistence1781160002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY,
        email varchar(320) NOT NULL,
        password_hash varchar NOT NULL,
        full_name varchar(200) NOT NULL,
        phone varchar(40),
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_users_email_not_blank CHECK (length(btrim(email)) > 0),
        CONSTRAINT chk_users_email_lowercase CHECK (email = lower(email)),
        CONSTRAINT chk_users_password_hash_not_blank CHECK (length(btrim(password_hash)) > 0),
        CONSTRAINT chk_users_full_name_not_blank CHECK (length(btrim(full_name)) > 0)
      )
    `);

    await queryRunner.query('CREATE UNIQUE INDEX idx_users_email ON users (email)');
    await queryRunner.query('CREATE INDEX idx_users_is_active ON users (is_active)');

    await queryRunner.query(`
      CREATE TABLE user_roles (
        user_id uuid NOT NULL,
        role_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role_id),
        CONSTRAINT fk_user_roles_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_roles_role_id FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
      )
    `);

    await queryRunner.query('CREATE INDEX idx_user_roles_user_id ON user_roles (user_id)');
    await queryRunner.query('CREATE INDEX idx_user_roles_role_id ON user_roles (role_id)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_user_roles_role_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_user_roles_user_id');
    await queryRunner.query('DROP TABLE IF EXISTS user_roles');
    await queryRunner.query('DROP INDEX IF EXISTS idx_users_is_active');
    await queryRunner.query('DROP INDEX IF EXISTS idx_users_email');
    await queryRunner.query('DROP TABLE IF EXISTS users');
  }
}
