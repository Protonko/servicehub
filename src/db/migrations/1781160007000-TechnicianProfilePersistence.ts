import { MigrationInterface, QueryRunner } from 'typeorm';

export class TechnicianProfilePersistence1781160007000 implements MigrationInterface {
  name = 'TechnicianProfilePersistence1781160007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE technician_status AS ENUM ('active', 'inactive', 'on_leave', 'suspended')",
    );

    await queryRunner.query(`
      CREATE TABLE technicians (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL,
        status technician_status NOT NULL DEFAULT 'active',
        daily_assignment_limit integer NOT NULL,
        rating numeric(3,2),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_technicians_user_id UNIQUE (user_id),
        CONSTRAINT fk_technicians_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT chk_technicians_daily_assignment_limit_positive CHECK (daily_assignment_limit > 0),
        CONSTRAINT chk_technicians_rating_range CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))
      )
    `);
    await queryRunner.query('CREATE INDEX idx_technicians_status ON technicians (status)');

    await queryRunner.query(`
      CREATE TABLE technician_skills (
        technician_id uuid NOT NULL,
        skill_id uuid NOT NULL,
        CONSTRAINT pk_technician_skills PRIMARY KEY (technician_id, skill_id),
        CONSTRAINT fk_technician_skills_technician_id FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
        CONSTRAINT fk_technician_skills_skill_id FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_technician_skills_skill_id ON technician_skills (skill_id)',
    );

    await queryRunner.query(`
      CREATE TABLE technician_service_areas (
        technician_id uuid NOT NULL,
        service_area_id uuid NOT NULL,
        CONSTRAINT pk_technician_service_areas PRIMARY KEY (technician_id, service_area_id),
        CONSTRAINT fk_technician_service_areas_technician_id FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
        CONSTRAINT fk_technician_service_areas_service_area_id FOREIGN KEY (service_area_id) REFERENCES service_areas(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_technician_service_areas_service_area_id ON technician_service_areas (service_area_id)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_technician_service_areas_service_area_id');
    await queryRunner.query('DROP TABLE IF EXISTS technician_service_areas');
    await queryRunner.query('DROP INDEX IF EXISTS idx_technician_skills_skill_id');
    await queryRunner.query('DROP TABLE IF EXISTS technician_skills');
    await queryRunner.query('DROP INDEX IF EXISTS idx_technicians_status');
    await queryRunner.query('DROP TABLE IF EXISTS technicians');
    await queryRunner.query('DROP TYPE IF EXISTS technician_status');
  }
}
