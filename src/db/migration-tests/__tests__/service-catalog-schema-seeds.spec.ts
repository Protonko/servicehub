import { QueryRunner } from 'typeorm';

import { ServiceCatalogSchemaSeeds1781160003000 } from '../../migrations/1781160003000-ServiceCatalogSchemaSeeds';

const createQueryRunner = () => {
  const queries: Array<{ query: string; parameters?: unknown[] }> = [];

  const queryRunner = {
    query: jest.fn((query: string, parameters?: unknown[]) => {
      queries.push({ query, parameters });
      return Promise.resolve();
    }),
  } as unknown as QueryRunner;

  return { queryRunner, queries };
};

describe('ServiceCatalogSchemaSeeds migration', () => {
  it('creates service category, skill, and SLA policy tables with catalog constraints', async () => {
    const migration = new ServiceCatalogSchemaSeeds1781160003000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.up(queryRunner);

    const sql = queries.map(({ query }) => query).join('\n');

    expect(sql).toContain('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    expect(sql).toContain('CREATE TABLE service_categories');
    expect(sql).toContain('id uuid PRIMARY KEY DEFAULT gen_random_uuid()');
    expect(sql).toContain('CONSTRAINT chk_service_categories_code_not_blank');
    expect(sql).toContain('CONSTRAINT chk_service_categories_name_not_blank');
    expect(sql).toContain(
      'CREATE UNIQUE INDEX idx_service_categories_code ON service_categories (code)',
    );
    expect(sql).toContain(
      'CREATE INDEX idx_service_categories_is_active ON service_categories (is_active)',
    );

    expect(sql).toContain('CREATE TABLE skills');
    expect(sql).toContain('CONSTRAINT chk_skills_code_not_blank');
    expect(sql).toContain('CONSTRAINT chk_skills_name_not_blank');
    expect(sql).toContain('CREATE UNIQUE INDEX idx_skills_code ON skills (code)');

    expect(sql).toContain('CREATE TABLE sla_policies');
    expect(sql).toContain(
      "CONSTRAINT chk_sla_policies_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))",
    );
    expect(sql).toContain(
      'CONSTRAINT chk_sla_policies_assignment_deadline_positive CHECK (assignment_deadline_minutes > 0)',
    );
    expect(sql).toContain(
      'CONSTRAINT chk_sla_policies_completion_deadline_positive CHECK (completion_deadline_minutes > 0)',
    );
    expect(sql).toContain('CREATE UNIQUE INDEX idx_sla_policies_code ON sla_policies (code)');
  });

  it('creates service type constraints that protect request creation metadata', async () => {
    const migration = new ServiceCatalogSchemaSeeds1781160003000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.up(queryRunner);

    const sql = queries.map(({ query }) => query).join('\n');

    expect(sql).toContain('CREATE TABLE service_types');
    expect(sql).toContain(
      'CONSTRAINT fk_service_types_category_id FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE RESTRICT',
    );
    expect(sql).toContain(
      'CONSTRAINT fk_service_types_sla_policy_id FOREIGN KEY (sla_policy_id) REFERENCES sla_policies(id) ON DELETE RESTRICT',
    );
    expect(sql).toContain(
      "CONSTRAINT chk_service_types_default_priority CHECK (default_priority IN ('low', 'normal', 'high', 'urgent'))",
    );
    expect(sql).toContain(
      'CONSTRAINT chk_service_types_estimated_duration_positive CHECK (estimated_duration_minutes > 0)',
    );
    expect(sql).toContain(
      'CREATE UNIQUE INDEX idx_service_types_category_code ON service_types (category_id, code)',
    );
    expect(sql).toContain(
      'CREATE UNIQUE INDEX idx_service_types_one_other_per_category ON service_types (category_id) WHERE is_other = true',
    );
    expect(sql).toContain(
      'CREATE INDEX idx_service_types_sla_policy_id ON service_types (sla_policy_id)',
    );
  });

  it('creates required skill links with composite primary key and foreign keys', async () => {
    const migration = new ServiceCatalogSchemaSeeds1781160003000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.up(queryRunner);

    const sql = queries.map(({ query }) => query).join('\n');

    expect(sql).toContain('CREATE TABLE service_type_required_skills');
    expect(sql).toContain(
      'CONSTRAINT pk_service_type_required_skills PRIMARY KEY (service_type_id, skill_id)',
    );
    expect(sql).toContain(
      'CONSTRAINT fk_service_type_required_skills_service_type_id FOREIGN KEY (service_type_id) REFERENCES service_types(id) ON DELETE CASCADE',
    );
    expect(sql).toContain(
      'CONSTRAINT fk_service_type_required_skills_skill_id FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE RESTRICT',
    );
    expect(sql).toContain(
      'CREATE INDEX idx_service_type_required_skills_service_type_id ON service_type_required_skills (service_type_id)',
    );
    expect(sql).toContain(
      'CREATE INDEX idx_service_type_required_skills_skill_id ON service_type_required_skills (skill_id)',
    );
  });

  it('seeds operational catalog rows needed by later service requests', async () => {
    const migration = new ServiceCatalogSchemaSeeds1781160003000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.up(queryRunner);

    const categoryInserts = queries.filter(({ query }) =>
      query.includes('INSERT INTO service_categories'),
    );
    const skillInserts = queries.filter(({ query }) => query.includes('INSERT INTO skills'));
    const slaPolicyInserts = queries.filter(({ query }) =>
      query.includes('INSERT INTO sla_policies'),
    );
    const serviceTypeInserts = queries.filter(({ query }) =>
      query.includes('INSERT INTO service_types'),
    );
    const requiredSkillInserts = queries.filter(({ query }) =>
      query.includes('INSERT INTO service_type_required_skills'),
    );

    expect(categoryInserts).toHaveLength(2);
    expect(categoryInserts.map(({ parameters }) => parameters?.[0])).toEqual(['HVAC', 'PLUMBING']);
    expect(categoryInserts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ query: expect.stringContaining('ON CONFLICT (code) DO UPDATE') }),
      ]),
    );

    expect(skillInserts).toHaveLength(4);
    expect(skillInserts.map(({ parameters }) => parameters?.[0])).toEqual([
      'HVAC_REPAIR',
      'HVAC_DIAGNOSTICS',
      'PLUMBING_REPAIR',
      'DRAIN_CLEANING',
    ]);

    expect(slaPolicyInserts).toHaveLength(3);
    expect(slaPolicyInserts.map(({ parameters }) => parameters?.[0])).toEqual([
      'STANDARD_24H',
      'HIGH_8H',
      'TRIAGE_4H',
    ]);

    expect(serviceTypeInserts).toHaveLength(6);
    expect(serviceTypeInserts.map(({ parameters }) => parameters?.[2])).toEqual([
      'AC_NOT_COOLING',
      'AC_LEAKING',
      'OTHER',
      'WATER_LEAK',
      'BLOCKED_DRAIN',
      'OTHER',
    ]);
    expect(serviceTypeInserts.filter(({ parameters }) => parameters?.[7] === true)).toHaveLength(2);
    expect(serviceTypeInserts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          query: expect.stringContaining('FROM service_categories category'),
        }),
        expect.objectContaining({
          query: expect.stringContaining(
            'INNER JOIN sla_policies sla_policy ON sla_policy.code = $2',
          ),
        }),
      ]),
    );
    expect(serviceTypeInserts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          query: expect.stringContaining('ON CONFLICT (category_id, code) DO UPDATE'),
        }),
      ]),
    );

    expect(requiredSkillInserts).toHaveLength(5);
    expect(requiredSkillInserts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          query: expect.stringContaining('FROM service_types service_type'),
        }),
        expect.objectContaining({
          query: expect.stringContaining('INNER JOIN skills skill ON skill.code = $3'),
        }),
        expect.objectContaining({
          query: expect.stringContaining('ON CONFLICT (service_type_id, skill_id) DO NOTHING'),
        }),
      ]),
    );
  });

  it('drops service catalog schema in dependency order on revert', async () => {
    const migration = new ServiceCatalogSchemaSeeds1781160003000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.down(queryRunner);

    expect(queries.map(({ query }) => query)).toEqual([
      'DROP INDEX IF EXISTS idx_service_type_required_skills_skill_id',
      'DROP INDEX IF EXISTS idx_service_type_required_skills_service_type_id',
      'DROP TABLE IF EXISTS service_type_required_skills',
      'DROP INDEX IF EXISTS idx_service_types_is_active',
      'DROP INDEX IF EXISTS idx_service_types_sla_policy_id',
      'DROP INDEX IF EXISTS idx_service_types_category_id',
      'DROP INDEX IF EXISTS idx_service_types_one_other_per_category',
      'DROP INDEX IF EXISTS idx_service_types_category_code',
      'DROP TABLE IF EXISTS service_types',
      'DROP INDEX IF EXISTS idx_sla_policies_is_active',
      'DROP INDEX IF EXISTS idx_sla_policies_code',
      'DROP TABLE IF EXISTS sla_policies',
      'DROP INDEX IF EXISTS idx_skills_is_active',
      'DROP INDEX IF EXISTS idx_skills_code',
      'DROP TABLE IF EXISTS skills',
      'DROP INDEX IF EXISTS idx_service_categories_is_active',
      'DROP INDEX IF EXISTS idx_service_categories_code',
      'DROP TABLE IF EXISTS service_categories',
    ]);
  });
});
