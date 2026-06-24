import { QueryRunner } from 'typeorm';

import { TechnicianProfilePersistence1781160007000 } from '../../migrations/1781160007000-TechnicianProfilePersistence';

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

describe('TechnicianProfilePersistence migration', () => {
  it('creates technician profiles with eligibility and data constraints', async () => {
    const migration = new TechnicianProfilePersistence1781160007000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.up(queryRunner);

    const sql = queries.join('\n');

    expect(sql).toContain(
      "CREATE TYPE technician_status AS ENUM ('active', 'inactive', 'on_leave', 'suspended')",
    );
    expect(sql).toContain('CREATE TABLE technicians');
    expect(sql).toContain('CONSTRAINT uq_technicians_user_id UNIQUE (user_id)');
    expect(sql).toContain('CONSTRAINT fk_technicians_user_id');
    expect(sql).toContain('CONSTRAINT chk_technicians_daily_assignment_limit_positive');
    expect(sql).toContain('CONSTRAINT chk_technicians_rating_range');
    expect(sql).toContain('CREATE INDEX idx_technicians_status ON technicians (status)');
  });

  it('creates skill and service-area links with composite keys and foreign keys', async () => {
    const migration = new TechnicianProfilePersistence1781160007000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.up(queryRunner);

    const sql = queries.join('\n');

    expect(sql).toContain('CREATE TABLE technician_skills');
    expect(sql).toContain('CONSTRAINT pk_technician_skills PRIMARY KEY');
    expect(sql).toContain('CONSTRAINT fk_technician_skills_skill_id');
    expect(sql).toContain('CREATE TABLE technician_service_areas');
    expect(sql).toContain('CONSTRAINT pk_technician_service_areas PRIMARY KEY');
    expect(sql).toContain('CONSTRAINT fk_technician_service_areas_service_area_id');
  });

  it('drops links, profile, and enum in dependency order', async () => {
    const migration = new TechnicianProfilePersistence1781160007000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.down(queryRunner);

    expect(queries.at(-1)).toBe('DROP TYPE IF EXISTS technician_status');
    expect(queries.indexOf('DROP TABLE IF EXISTS technician_service_areas')).toBeLessThan(
      queries.indexOf('DROP TABLE IF EXISTS technicians'),
    );
    expect(queries.indexOf('DROP TABLE IF EXISTS technician_skills')).toBeLessThan(
      queries.indexOf('DROP TABLE IF EXISTS technicians'),
    );
  });
});
