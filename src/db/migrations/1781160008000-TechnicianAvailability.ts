import { MigrationInterface, QueryRunner } from 'typeorm';

export class TechnicianAvailability1781160008000 implements MigrationInterface {
  name = 'TechnicianAvailability1781160008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE technician_availability_windows (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        technician_id uuid NOT NULL,
        starts_at timestamptz NOT NULL,
        ends_at timestamptz NOT NULL,
        is_available boolean NOT NULL,
        reason varchar(160),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_technician_availability_technician_id
          FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE CASCADE,
        CONSTRAINT chk_technician_availability_time_range CHECK (starts_at < ends_at)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_technician_availability_technician_time
      ON technician_availability_windows (technician_id, starts_at, ends_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_technician_availability_technician_time');
    await queryRunner.query('DROP TABLE IF EXISTS technician_availability_windows');
  }
}
