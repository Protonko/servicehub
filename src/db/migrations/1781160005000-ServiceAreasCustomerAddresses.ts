import { MigrationInterface, QueryRunner } from 'typeorm';

const serviceAreaRows = [
  {
    code: 'US_CA_SF_BAY',
    name: 'San Francisco Bay Area',
    description: 'San Francisco Bay Area operating zone.',
  },
  {
    code: 'US_NY_NYC',
    name: 'New York City Metro',
    description: 'New York City metro operating zone.',
  },
] as const;

export class ServiceAreasCustomerAddresses1781160005000 implements MigrationInterface {
  name = 'ServiceAreasCustomerAddresses1781160005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    await queryRunner.query(`
      CREATE TABLE service_areas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        code varchar(80) NOT NULL,
        name varchar(160) NOT NULL,
        description text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_service_areas_code_not_blank CHECK (length(btrim(code)) > 0),
        CONSTRAINT chk_service_areas_name_not_blank CHECK (length(btrim(name)) > 0)
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX idx_service_areas_code ON service_areas (code)');
    await queryRunner.query(
      'CREATE INDEX idx_service_areas_is_active ON service_areas (is_active)',
    );

    await queryRunner.query(`
      CREATE TABLE customer_addresses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id uuid NOT NULL,
        service_area_id uuid NOT NULL,
        line1 varchar(240) NOT NULL,
        line2 varchar(240),
        city varchar(120) NOT NULL,
        postal_code varchar(40),
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_customer_addresses_customer_id FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_customer_addresses_service_area_id FOREIGN KEY (service_area_id) REFERENCES service_areas(id) ON DELETE RESTRICT,
        CONSTRAINT chk_customer_addresses_line1_not_blank CHECK (length(btrim(line1)) > 0),
        CONSTRAINT chk_customer_addresses_city_not_blank CHECK (length(btrim(city)) > 0)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses (customer_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_customer_addresses_service_area_id ON customer_addresses (service_area_id)',
    );

    for (const serviceArea of serviceAreaRows) {
      await queryRunner.query(
        `
          INSERT INTO service_areas (code, name, description)
          VALUES ($1, $2, $3)
          ON CONFLICT (code) DO UPDATE
          SET name = EXCLUDED.name,
              description = EXCLUDED.description,
              is_active = true,
              updated_at = now()
        `,
        [serviceArea.code, serviceArea.name, serviceArea.description],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_customer_addresses_service_area_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_customer_addresses_customer_id');
    await queryRunner.query('DROP TABLE IF EXISTS customer_addresses');
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_areas_is_active');
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_areas_code');
    await queryRunner.query('DROP TABLE IF EXISTS service_areas');
  }
}
