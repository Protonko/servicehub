import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateServiceRequest1781160006000 implements MigrationInterface {
  name = 'CreateServiceRequest1781160006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    await queryRunner.query(`
      CREATE TABLE service_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id uuid NOT NULL,
        category_id uuid NOT NULL,
        service_type_id uuid NOT NULL,
        address_id uuid NOT NULL,
        sla_policy_id uuid NOT NULL,
        status varchar(40) NOT NULL,
        priority varchar(20) NOT NULL,
        description text NOT NULL,
        additional_contact_instructions text,
        preferred_start_at timestamptz NOT NULL,
        preferred_end_at timestamptz NOT NULL,
        estimated_duration_minutes int NOT NULL,
        assignment_deadline_at timestamptz NOT NULL,
        completion_deadline_at timestamptz NOT NULL,
        triaged_at timestamptz,
        assigned_at timestamptz,
        completed_at timestamptz,
        cancelled_at timestamptz,
        cancellation_reason text,
        escalated_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_service_requests_customer_id FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_service_requests_category_id FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE RESTRICT,
        CONSTRAINT fk_service_requests_service_type_id FOREIGN KEY (service_type_id) REFERENCES service_types(id) ON DELETE RESTRICT,
        CONSTRAINT fk_service_requests_address_id FOREIGN KEY (address_id) REFERENCES customer_addresses(id) ON DELETE RESTRICT,
        CONSTRAINT fk_service_requests_sla_policy_id FOREIGN KEY (sla_policy_id) REFERENCES sla_policies(id) ON DELETE RESTRICT,
        CONSTRAINT chk_service_requests_status CHECK (status IN ('created', 'needs_triage', 'triaged', 'assigned', 'accepted_by_technician', 'technician_on_the_way', 'in_progress', 'completed', 'cancelled', 'failed')),
        CONSTRAINT chk_service_requests_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        CONSTRAINT chk_service_requests_description_not_blank CHECK (length(btrim(description)) > 0),
        CONSTRAINT chk_service_requests_preferred_window CHECK (preferred_start_at < preferred_end_at),
        CONSTRAINT chk_service_requests_estimated_duration_positive CHECK (estimated_duration_minutes > 0)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_service_requests_customer_id ON service_requests (customer_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_service_requests_status_priority ON service_requests (status, priority)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_service_requests_service_type_id ON service_requests (service_type_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_service_requests_assignment_deadline_at ON service_requests (assignment_deadline_at)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_service_requests_completion_deadline_at ON service_requests (completion_deadline_at)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_service_requests_created_at ON service_requests (created_at)',
    );

    await queryRunner.query(`
      CREATE TABLE service_request_required_skills (
        service_request_id uuid NOT NULL,
        skill_id uuid NOT NULL,
        CONSTRAINT pk_service_request_required_skills PRIMARY KEY (service_request_id, skill_id),
        CONSTRAINT fk_service_request_required_skills_request_id FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
        CONSTRAINT fk_service_request_required_skills_skill_id FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_service_request_required_skills_skill_id ON service_request_required_skills (skill_id)',
    );

    await queryRunner.query(`
      CREATE TABLE service_request_attachments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        service_request_id uuid NOT NULL,
        uploaded_by_user_id uuid NOT NULL,
        file_name varchar(240) NOT NULL,
        mime_type varchar(120) NOT NULL,
        storage_key varchar(500) NOT NULL,
        kind varchar(60) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_service_request_attachments_request_id FOREIGN KEY (service_request_id) REFERENCES service_requests(id) ON DELETE CASCADE,
        CONSTRAINT fk_service_request_attachments_uploaded_by_user_id FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
        CONSTRAINT chk_service_request_attachments_file_name_not_blank CHECK (length(btrim(file_name)) > 0),
        CONSTRAINT chk_service_request_attachments_mime_type_not_blank CHECK (length(btrim(mime_type)) > 0),
        CONSTRAINT chk_service_request_attachments_storage_key_not_blank CHECK (length(btrim(storage_key)) > 0),
        CONSTRAINT chk_service_request_attachments_kind_not_blank CHECK (length(btrim(kind)) > 0)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_service_request_attachments_request_id ON service_request_attachments (service_request_id)',
    );

    await queryRunner.query(`
      CREATE TABLE audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_user_id uuid,
        action varchar(120) NOT NULL,
        entity_type varchar(120) NOT NULL,
        entity_id uuid NOT NULL,
        old_value jsonb,
        new_value jsonb,
        request_id varchar(120),
        correlation_id varchar(120),
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_audit_logs_actor_user_id FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT chk_audit_logs_action_not_blank CHECK (length(btrim(action)) > 0),
        CONSTRAINT chk_audit_logs_entity_type_not_blank CHECK (length(btrim(entity_type)) > 0)
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_type, entity_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_audit_logs_actor_created_at ON audit_logs (actor_user_id, created_at)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_audit_logs_correlation_id ON audit_logs (correlation_id)',
    );

    await queryRunner.query(`
      CREATE TABLE outbox_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type varchar(120) NOT NULL,
        aggregate_type varchar(120) NOT NULL,
        aggregate_id uuid NOT NULL,
        payload jsonb NOT NULL,
        status varchar(40) NOT NULL DEFAULT 'pending',
        attempts int NOT NULL DEFAULT 0,
        next_attempt_at timestamptz,
        locked_at timestamptz,
        locked_by varchar(120),
        processed_at timestamptz,
        failed_at timestamptz,
        failure_reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_outbox_events_status CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
        CONSTRAINT chk_outbox_events_attempts_non_negative CHECK (attempts >= 0),
        CONSTRAINT chk_outbox_events_event_type_not_blank CHECK (length(btrim(event_type)) > 0),
        CONSTRAINT chk_outbox_events_aggregate_type_not_blank CHECK (length(btrim(aggregate_type)) > 0)
      )
    `);
    await queryRunner.query(
      "CREATE INDEX idx_outbox_events_pending ON outbox_events (status, next_attempt_at, created_at) WHERE status = 'pending'",
    );
    await queryRunner.query(
      'CREATE INDEX idx_outbox_events_aggregate ON outbox_events (aggregate_type, aggregate_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_outbox_events_created_at ON outbox_events (created_at)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_outbox_events_created_at');
    await queryRunner.query('DROP INDEX IF EXISTS idx_outbox_events_aggregate');
    await queryRunner.query('DROP INDEX IF EXISTS idx_outbox_events_pending');
    await queryRunner.query('DROP TABLE IF EXISTS outbox_events');
    await queryRunner.query('DROP INDEX IF EXISTS idx_audit_logs_correlation_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_audit_logs_actor_created_at');
    await queryRunner.query('DROP INDEX IF EXISTS idx_audit_logs_entity');
    await queryRunner.query('DROP TABLE IF EXISTS audit_logs');
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_request_attachments_request_id');
    await queryRunner.query('DROP TABLE IF EXISTS service_request_attachments');
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_request_required_skills_skill_id');
    await queryRunner.query('DROP TABLE IF EXISTS service_request_required_skills');
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_requests_created_at');
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_requests_completion_deadline_at');
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_requests_assignment_deadline_at');
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_requests_service_type_id');
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_requests_status_priority');
    await queryRunner.query('DROP INDEX IF EXISTS idx_service_requests_customer_id');
    await queryRunner.query('DROP TABLE IF EXISTS service_requests');
  }
}
