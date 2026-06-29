import { QueryRunner } from 'typeorm';

import { TechnicianAvailability1781160008000 } from '../../migrations/1781160008000-TechnicianAvailability';

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

describe('TechnicianAvailability migration', () => {
  it('creates availability windows with ownership and range constraints', async () => {
    const migration = new TechnicianAvailability1781160008000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.up(queryRunner);
    const sql = queries.join('\n');

    expect(sql).toContain('CREATE TABLE technician_availability_windows');
    expect(sql).toContain('id uuid PRIMARY KEY DEFAULT gen_random_uuid()');
    expect(sql).toContain('CONSTRAINT fk_technician_availability_technician_id');
    expect(sql).toContain('REFERENCES technicians(id) ON DELETE CASCADE');
    expect(sql).toContain(
      'CONSTRAINT chk_technician_availability_time_range CHECK (starts_at < ends_at)',
    );
    expect(sql).toContain('CREATE INDEX idx_technician_availability_technician_time');
    expect(sql).toContain('(technician_id, starts_at, ends_at)');
  });

  it('drops the index before the table', async () => {
    const migration = new TechnicianAvailability1781160008000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.down(queryRunner);

    expect(queries).toEqual([
      'DROP INDEX IF EXISTS idx_technician_availability_technician_time',
      'DROP TABLE IF EXISTS technician_availability_windows',
    ]);
  });
});
