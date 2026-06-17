import { QueryRunner } from 'typeorm';

import { ServiceAreasCustomerAddresses1781160005000 } from '../../migrations/1781160005000-ServiceAreasCustomerAddresses';

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

describe('ServiceAreasCustomerAddresses migration', () => {
  it('creates service areas and customer addresses with ownership constraints', async () => {
    const migration = new ServiceAreasCustomerAddresses1781160005000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.up(queryRunner);

    const sql = queries.map(({ query }) => query).join('\n');

    expect(sql).toContain('CREATE TABLE service_areas');
    expect(sql).toContain('CONSTRAINT chk_service_areas_code_not_blank');
    expect(sql).toContain('CONSTRAINT chk_service_areas_name_not_blank');
    expect(sql).toContain('CREATE UNIQUE INDEX idx_service_areas_code ON service_areas (code)');
    expect(sql).toContain('CREATE INDEX idx_service_areas_is_active ON service_areas (is_active)');

    expect(sql).toContain('CREATE TABLE customer_addresses');
    expect(sql).toContain(
      'CONSTRAINT fk_customer_addresses_customer_id FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT',
    );
    expect(sql).toContain(
      'CONSTRAINT fk_customer_addresses_service_area_id FOREIGN KEY (service_area_id) REFERENCES service_areas(id) ON DELETE RESTRICT',
    );
    expect(sql).toContain('CONSTRAINT chk_customer_addresses_line1_not_blank');
    expect(sql).toContain('CONSTRAINT chk_customer_addresses_city_not_blank');
    expect(sql).toContain(
      'CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses (customer_id)',
    );
    expect(sql).toContain(
      'CREATE INDEX idx_customer_addresses_service_area_id ON customer_addresses (service_area_id)',
    );
  });

  it('seeds initial active service areas', async () => {
    const migration = new ServiceAreasCustomerAddresses1781160005000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.up(queryRunner);

    const inserts = queries.filter(({ query }) => query.includes('INSERT INTO service_areas'));

    expect(inserts).toHaveLength(2);
    expect(inserts.map(({ parameters }) => parameters?.[0])).toEqual([
      'US_CA_SF_BAY',
      'US_NY_NYC',
    ]);
    expect(inserts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ query: expect.stringContaining('ON CONFLICT (code) DO UPDATE') }),
      ]),
    );
  });

  it('drops tables in dependency order on revert', async () => {
    const migration = new ServiceAreasCustomerAddresses1781160005000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.down(queryRunner);

    expect(queries.map(({ query }) => query)).toEqual([
      'DROP INDEX IF EXISTS idx_customer_addresses_service_area_id',
      'DROP INDEX IF EXISTS idx_customer_addresses_customer_id',
      'DROP TABLE IF EXISTS customer_addresses',
      'DROP INDEX IF EXISTS idx_service_areas_is_active',
      'DROP INDEX IF EXISTS idx_service_areas_code',
      'DROP TABLE IF EXISTS service_areas',
    ]);
  });
});
