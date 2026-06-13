import { MigrationInterface, QueryRunner } from 'typeorm';

const categoryRows = [
  {
    code: 'HVAC',
    name: 'HVAC',
    description: 'Heating, ventilation, and air conditioning services.',
  },
  {
    code: 'PLUMBING',
    name: 'Plumbing',
    description: 'Water, drains, pipes, and fixture services.',
  },
] as const;

const skillRows = [
  {
    code: 'HVAC_REPAIR',
    name: 'HVAC Repair',
    description: 'Diagnose and repair common HVAC faults.',
  },
  {
    code: 'HVAC_DIAGNOSTICS',
    name: 'HVAC Diagnostics',
    description: 'Inspect unknown HVAC issues before repair planning.',
  },
  {
    code: 'PLUMBING_REPAIR',
    name: 'Plumbing Repair',
    description: 'Repair leaks, fixtures, and common pipe issues.',
  },
  {
    code: 'DRAIN_CLEANING',
    name: 'Drain Cleaning',
    description: 'Clear blocked drains and verify flow.',
  },
] as const;

const slaPolicyRows = [
  {
    code: 'STANDARD_24H',
    name: 'Standard 24 Hour Response',
    priority: 'normal',
    assignmentDeadlineMinutes: 240,
    completionDeadlineMinutes: 1440,
  },
  {
    code: 'HIGH_8H',
    name: 'High Priority 8 Hour Response',
    priority: 'high',
    assignmentDeadlineMinutes: 60,
    completionDeadlineMinutes: 480,
  },
  {
    code: 'TRIAGE_4H',
    name: 'Triage 4 Hour Review',
    priority: 'normal',
    assignmentDeadlineMinutes: 120,
    completionDeadlineMinutes: 240,
  },
] as const;

const serviceTypeRows = [
  {
    categoryCode: 'HVAC',
    slaPolicyCode: 'STANDARD_24H',
    code: 'AC_NOT_COOLING',
    name: 'Air conditioner does not cool',
    description: 'The air conditioner runs but does not reduce room temperature.',
    defaultPriority: 'normal',
    estimatedDurationMinutes: 90,
    isOther: false,
  },
  {
    categoryCode: 'HVAC',
    slaPolicyCode: 'HIGH_8H',
    code: 'AC_LEAKING',
    name: 'Air conditioner is leaking',
    description: 'Water or refrigerant leak around an air conditioning unit.',
    defaultPriority: 'high',
    estimatedDurationMinutes: 120,
    isOther: false,
  },
  {
    categoryCode: 'HVAC',
    slaPolicyCode: 'TRIAGE_4H',
    code: 'OTHER',
    name: 'Other HVAC issue',
    description: 'Customer cannot classify the HVAC problem.',
    defaultPriority: 'normal',
    estimatedDurationMinutes: 60,
    isOther: true,
  },
  {
    categoryCode: 'PLUMBING',
    slaPolicyCode: 'HIGH_8H',
    code: 'WATER_LEAK',
    name: 'Water leak',
    description: 'Visible water leak from a pipe, fixture, or appliance connection.',
    defaultPriority: 'high',
    estimatedDurationMinutes: 120,
    isOther: false,
  },
  {
    categoryCode: 'PLUMBING',
    slaPolicyCode: 'STANDARD_24H',
    code: 'BLOCKED_DRAIN',
    name: 'Blocked drain',
    description: 'Sink, shower, or floor drain is blocked or draining slowly.',
    defaultPriority: 'normal',
    estimatedDurationMinutes: 90,
    isOther: false,
  },
  {
    categoryCode: 'PLUMBING',
    slaPolicyCode: 'TRIAGE_4H',
    code: 'OTHER',
    name: 'Other plumbing issue',
    description: 'Customer cannot classify the plumbing problem.',
    defaultPriority: 'normal',
    estimatedDurationMinutes: 60,
    isOther: true,
  },
] as const;

const requiredSkillRows = [
  {
    serviceTypeCategoryCode: 'HVAC',
    serviceTypeCode: 'AC_NOT_COOLING',
    skillCode: 'HVAC_REPAIR',
  },
  {
    serviceTypeCategoryCode: 'HVAC',
    serviceTypeCode: 'AC_LEAKING',
    skillCode: 'HVAC_REPAIR',
  },
  {
    serviceTypeCategoryCode: 'HVAC',
    serviceTypeCode: 'AC_LEAKING',
    skillCode: 'HVAC_DIAGNOSTICS',
  },
  {
    serviceTypeCategoryCode: 'PLUMBING',
    serviceTypeCode: 'WATER_LEAK',
    skillCode: 'PLUMBING_REPAIR',
  },
  {
    serviceTypeCategoryCode: 'PLUMBING',
    serviceTypeCode: 'BLOCKED_DRAIN',
    skillCode: 'DRAIN_CLEANING',
  },
] as const;

export class ServiceCatalogSchemaSeeds1781160003000 implements MigrationInterface {
  name = 'ServiceCatalogSchemaSeeds1781160003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    await queryRunner.query(`
      CREATE TABLE service_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(80) NOT NULL,
        name varchar(160) NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_service_categories_code_not_blank CHECK (length(btrim(code)) > 0),
        CONSTRAINT chk_service_categories_name_not_blank CHECK (length(btrim(name)) > 0)
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX idx_service_categories_code ON service_categories (code)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_service_categories_is_active ON service_categories (is_active)',
    );

    await queryRunner.query(`
      CREATE TABLE skills (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(80) NOT NULL,
        name varchar(160) NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_skills_code_not_blank CHECK (length(btrim(code)) > 0),
        CONSTRAINT chk_skills_name_not_blank CHECK (length(btrim(name)) > 0)
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX idx_skills_code ON skills (code)');
    await queryRunner.query('CREATE INDEX idx_skills_is_active ON skills (is_active)');

    await queryRunner.query(`
      CREATE TABLE sla_policies (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(80) NOT NULL,
        name varchar(160) NOT NULL,
        priority varchar(20) NOT NULL,
        assignment_deadline_minutes int NOT NULL,
        completion_deadline_minutes int NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_sla_policies_code_not_blank CHECK (length(btrim(code)) > 0),
        CONSTRAINT chk_sla_policies_name_not_blank CHECK (length(btrim(name)) > 0),
        CONSTRAINT chk_sla_policies_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        CONSTRAINT chk_sla_policies_assignment_deadline_positive CHECK (assignment_deadline_minutes > 0),
        CONSTRAINT chk_sla_policies_completion_deadline_positive CHECK (completion_deadline_minutes > 0)
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX idx_sla_policies_code ON sla_policies (code)');
    await queryRunner.query('CREATE INDEX idx_sla_policies_is_active ON sla_policies (is_active)');

    await queryRunner.query(`
      CREATE TABLE service_types (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        category_id uuid NOT NULL,
        sla_policy_id uuid NOT NULL,
        code varchar(100) NOT NULL,
        name varchar(200) NOT NULL,
        description text,
        default_priority varchar(20) NOT NULL,
        estimated_duration_minutes int NOT NULL,
        is_other boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_service_types_category_id FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE RESTRICT,
        CONSTRAINT fk_service_types_sla_policy_id FOREIGN KEY (sla_policy_id) REFERENCES sla_policies(id) ON DELETE RESTRICT,
        CONSTRAINT chk_service_types_code_not_blank CHECK (length(btrim(code)) > 0),
        CONSTRAINT chk_service_types_name_not_blank CHECK (length(btrim(name)) > 0),
        CONSTRAINT chk_service_types_default_priority CHECK (default_priority IN ('low', 'normal', 'high', 'urgent')),
        CONSTRAINT chk_service_types_estimated_duration_positive CHECK (estimated_duration_minutes > 0)
      )
    `);
    await queryRunner.query(
      'CREATE UNIQUE INDEX idx_service_types_category_code ON service_types (category_id, code)',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX idx_service_types_one_other_per_category ON service_types (category_id) WHERE is_other = true',
    );
    await queryRunner.query(
      'CREATE INDEX idx_service_types_category_id ON service_types (category_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_service_types_sla_policy_id ON service_types (sla_policy_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_service_types_is_active ON service_types (is_active)',
    );

    await queryRunner.query(`
      CREATE TABLE service_type_required_skills (
        service_type_id uuid NOT NULL,
        skill_id uuid NOT NULL,
        CONSTRAINT pk_service_type_required_skills PRIMARY KEY (service_type_id, skill_id),
        CONSTRAINT fk_service_type_required_skills_service_type_id FOREIGN KEY (service_type_id) REFERENCES service_types(id) ON DELETE CASCADE,
        CONSTRAINT fk_service_type_required_skills_skill_id FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_service_type_required_skills_service_type_id ON service_type_required_skills (service_type_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_service_type_required_skills_skill_id ON service_type_required_skills (skill_id)',
    );

    for (const category of categoryRows) {
      await queryRunner.query(
        `
          INSERT INTO service_categories (code, name, description)
          VALUES ($1, $2, $3)
          ON CONFLICT (code) DO UPDATE
          SET name = EXCLUDED.name,
              description = EXCLUDED.description,
              is_active = true,
              updated_at = now()
        `,
        [category.code, category.name, category.description],
      );
    }

    for (const skill of skillRows) {
      await queryRunner.query(
        `
          INSERT INTO skills (code, name, description)
          VALUES ($1, $2, $3)
          ON CONFLICT (code) DO UPDATE
          SET name = EXCLUDED.name,
              description = EXCLUDED.description,
              is_active = true,
              updated_at = now()
        `,
        [skill.code, skill.name, skill.description],
      );
    }

    for (const slaPolicy of slaPolicyRows) {
      await queryRunner.query(
        `
          INSERT INTO sla_policies (
            code,
            name,
            priority,
            assignment_deadline_minutes,
            completion_deadline_minutes
          )
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (code) DO UPDATE
          SET name = EXCLUDED.name,
              priority = EXCLUDED.priority,
              assignment_deadline_minutes = EXCLUDED.assignment_deadline_minutes,
              completion_deadline_minutes = EXCLUDED.completion_deadline_minutes,
              is_active = true,
              updated_at = now()
        `,
        [
          slaPolicy.code,
          slaPolicy.name,
          slaPolicy.priority,
          slaPolicy.assignmentDeadlineMinutes,
          slaPolicy.completionDeadlineMinutes,
        ],
      );
    }

    for (const serviceType of serviceTypeRows) {
      await queryRunner.query(
        `
          INSERT INTO service_types (
            category_id,
            sla_policy_id,
            code,
            name,
            description,
            default_priority,
            estimated_duration_minutes,
            is_other
          )
          SELECT
            category.id,
            sla_policy.id,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
          FROM service_categories category
          INNER JOIN sla_policies sla_policy ON sla_policy.code = $2
          WHERE category.code = $1
          ON CONFLICT (category_id, code) DO UPDATE
          SET sla_policy_id = EXCLUDED.sla_policy_id,
              name = EXCLUDED.name,
              description = EXCLUDED.description,
              default_priority = EXCLUDED.default_priority,
              estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
              is_other = EXCLUDED.is_other,
              is_active = true,
              updated_at = now()
        `,
        [
          serviceType.categoryCode,
          serviceType.slaPolicyCode,
          serviceType.code,
          serviceType.name,
          serviceType.description,
          serviceType.defaultPriority,
          serviceType.estimatedDurationMinutes,
          serviceType.isOther,
        ],
      );
    }

    for (const requiredSkill of requiredSkillRows) {
      await queryRunner.query(
        `
          INSERT INTO service_type_required_skills (service_type_id, skill_id)
          SELECT service_type.id, skill.id
          FROM service_types service_type
          INNER JOIN service_categories category ON category.id = service_type.category_id
          INNER JOIN skills skill ON skill.code = $3
          WHERE category.code = $1
            AND service_type.code = $2
          ON CONFLICT (service_type_id, skill_id) DO NOTHING
        `,
        [
          requiredSkill.serviceTypeCategoryCode,
          requiredSkill.serviceTypeCode,
          requiredSkill.skillCode,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_type_required_skills_skill_id');
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_service_type_required_skills_service_type_id',
    );
    await queryRunner.query('DROP TABLE IF EXISTS service_type_required_skills');
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_types_is_active');
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_types_sla_policy_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_types_category_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_types_one_other_per_category');
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_types_category_code');
    await queryRunner.query('DROP TABLE IF EXISTS service_types');
    await queryRunner.query('DROP INDEX IF EXISTS idx_sla_policies_is_active');
    await queryRunner.query('DROP INDEX IF EXISTS idx_sla_policies_code');
    await queryRunner.query('DROP TABLE IF EXISTS sla_policies');
    await queryRunner.query('DROP INDEX IF EXISTS idx_skills_is_active');
    await queryRunner.query('DROP INDEX IF EXISTS idx_skills_code');
    await queryRunner.query('DROP TABLE IF EXISTS skills');
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_categories_is_active');
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_categories_code');
    await queryRunner.query('DROP TABLE IF EXISTS service_categories');
  }
}
