import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssignmentReadFoundation1781160009000 implements MigrationInterface {
  name = 'AssignmentReadFoundation1781160009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TYPE assignment_status AS ENUM ('assigned', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled', 'rejected')",
    );
    await queryRunner.query(`
      CREATE TABLE assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_request_id uuid NOT NULL,
        technician_id uuid NOT NULL,
        assigned_by_user_id uuid NOT NULL,
        status assignment_status NOT NULL,
        starts_at timestamptz NOT NULL,
        ends_at timestamptz NOT NULL,
        accepted_at timestamptz,
        on_the_way_at timestamptz,
        started_at timestamptz,
        completed_at timestamptz,
        cancelled_at timestamptz,
        cancellation_reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_assignments_service_request_id
          FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE RESTRICT,
        CONSTRAINT fk_assignments_technician_id
          FOREIGN KEY (technician_id) REFERENCES technicians(id) ON DELETE RESTRICT,
        CONSTRAINT fk_assignments_assigned_by_user_id
          FOREIGN KEY (assigned_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT chk_assignments_time_range CHECK (starts_at < ends_at)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_assignments_request_id ON assignments (service_request_id)',
    );
    await queryRunner.query(`
      CREATE INDEX idx_assignments_technician_time
      ON assignments (technician_id, starts_at, ends_at)
    `);
    await queryRunner.query('CREATE INDEX idx_assignments_status ON assignments (status)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_assignments_status');
    await queryRunner.query('DROP INDEX IF EXISTS idx_assignments_technician_time');
    await queryRunner.query('DROP INDEX IF EXISTS idx_assignments_request_id');
    await queryRunner.query('DROP TABLE IF EXISTS assignments');
    await queryRunner.query('DROP TYPE IF EXISTS assignment_status');
  }
}
