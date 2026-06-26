import { QueryRunner } from 'typeorm';

import { AssignmentReadFoundation1781160009000 } from '../../migrations/1781160009000-AssignmentReadFoundation';

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

describe('AssignmentReadFoundation migration', () => {
  it('creates the documented assignment schema for overlap reads', async () => {
    const migration = new AssignmentReadFoundation1781160009000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.up(queryRunner);
    const sql = queries.join('\n');

    expect(sql).toContain(
      "CREATE TYPE assignment_status AS ENUM ('assigned', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled', 'rejected')",
    );
    expect(sql).toContain('CREATE TABLE assignments');
    expect(sql).toContain('CONSTRAINT fk_assignments_service_request_id');
    expect(sql).toContain('CONSTRAINT fk_assignments_technician_id');
    expect(sql).toContain('CONSTRAINT fk_assignments_assigned_by_user_id');
    expect(sql).toContain('CONSTRAINT chk_assignments_time_range CHECK (starts_at < ends_at)');
    expect(sql).toContain('CREATE INDEX idx_assignments_request_id');
    expect(sql).toContain('CREATE INDEX idx_assignments_technician_time');
    expect(sql).toContain('CREATE INDEX idx_assignments_status');
  });

  it('drops the table before its enum', async () => {
    const migration = new AssignmentReadFoundation1781160009000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.down(queryRunner);

    expect(queries.indexOf('DROP TABLE IF EXISTS assignments')).toBeLessThan(
      queries.indexOf('DROP TYPE IF EXISTS assignment_status'),
    );
  });
});
