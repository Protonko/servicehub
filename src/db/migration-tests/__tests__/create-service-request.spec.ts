import { QueryRunner } from 'typeorm';

import { CreateServiceRequest1781160006000 } from '../../migrations/1781160006000-CreateServiceRequest';

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

describe('CreateServiceRequest migration', () => {
  it('creates service request tables with lifecycle and ownership constraints', async () => {
    const migration = new CreateServiceRequest1781160006000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.up(queryRunner);

    const sql = queries.map(({ query }) => query).join('\n');

    expect(sql).toContain('CREATE TABLE service_requests');
    expect(sql).toContain(
      'CONSTRAINT fk_service_requests_customer_id FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT',
    );
    expect(sql).toContain(
      'CONSTRAINT fk_service_requests_address_id FOREIGN KEY (address_id) REFERENCES customer_addresses(id) ON DELETE RESTRICT',
    );
    expect(sql).toContain('CONSTRAINT chk_service_requests_status CHECK');
    expect(sql).toContain('CONSTRAINT chk_service_requests_priority CHECK');
    expect(sql).toContain('CONSTRAINT chk_service_requests_description_not_blank');
    expect(sql).toContain('CONSTRAINT chk_service_requests_preferred_window');
    expect(sql).toContain(
      'CREATE INDEX idx_service_requests_status_priority ON service_requests (status, priority)',
    );

    expect(sql).toContain('CREATE TABLE service_request_required_skills');
    expect(sql).toContain(
      'CONSTRAINT pk_service_request_required_skills PRIMARY KEY (service_request_id, skill_id)',
    );
    expect(sql).toContain(
      'CONSTRAINT fk_service_request_required_skills_request_id FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE',
    );

    expect(sql).toContain('CREATE TABLE service_request_attachments');
    expect(sql).toContain(
      'CONSTRAINT fk_service_request_attachments_uploaded_by_user_id FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE RESTRICT',
    );
    expect(sql).toContain('CONSTRAINT chk_service_request_attachments_file_name_not_blank');
  });

  it('creates audit and outbox tables for transactional side effects', async () => {
    const migration = new CreateServiceRequest1781160006000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.up(queryRunner);

    const sql = queries.map(({ query }) => query).join('\n');

    expect(sql).toContain('CREATE TABLE audit_logs');
    expect(sql).toContain(
      'CONSTRAINT fk_audit_logs_actor_user_id FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL',
    );
    expect(sql).toContain(
      'CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id)',
    );
    expect(sql).toContain('CREATE TABLE outbox_events');
    expect(sql).toContain(
      "CONSTRAINT chk_outbox_events_status CHECK (status IN ('pending', 'processing', 'processed', 'failed'))",
    );
    expect(sql).toContain(
      "CREATE INDEX idx_outbox_events_pending ON outbox_events (status, next_attempt_at, created_at) WHERE status = 'pending'",
    );
  });

  it('drops tables in dependency order on revert', async () => {
    const migration = new CreateServiceRequest1781160006000();
    const { queryRunner, queries } = createQueryRunner();

    await migration.down(queryRunner);

    expect(queries.map(({ query }) => query)).toEqual([
      'DROP INDEX IF EXISTS idx_outbox_events_created_at',
      'DROP INDEX IF EXISTS idx_outbox_events_aggregate',
      'DROP INDEX IF EXISTS idx_outbox_events_pending',
      'DROP TABLE IF EXISTS outbox_events',
      'DROP INDEX IF EXISTS idx_audit_logs_correlation_id',
      'DROP INDEX IF EXISTS idx_audit_logs_actor_created_at',
      'DROP INDEX IF EXISTS idx_audit_logs_entity',
      'DROP TABLE IF EXISTS audit_logs',
      'DROP INDEX IF EXISTS idx_service_request_attachments_request_id',
      'DROP TABLE IF EXISTS service_request_attachments',
      'DROP INDEX IF EXISTS idx_service_request_required_skills_skill_id',
      'DROP TABLE IF EXISTS service_request_required_skills',
      'DROP INDEX IF EXISTS idx_service_requests_created_at',
      'DROP INDEX IF EXISTS idx_service_requests_completion_deadline_at',
      'DROP INDEX IF EXISTS idx_service_requests_assignment_deadline_at',
      'DROP INDEX IF EXISTS idx_service_requests_service_type_id',
      'DROP INDEX IF EXISTS idx_service_requests_status_priority',
      'DROP INDEX IF EXISTS idx_service_requests_customer_id',
      'DROP TABLE IF EXISTS service_requests',
    ]);
  });
});
