import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { TechnicianEligibilityQuery } from '@application/queries/technician-eligibility.query';
import { EligibleTechnicianCandidate } from '@application/read-models';
import { ACTIVE_ASSIGNMENT_STATUSES } from '@domain/model';

import { TechnicianEligibilityMapper } from './technician-eligibility.mapper';
import { EligibleTechnicianRow } from './technician-eligibility.types';

@Injectable()
export class TechnicianEligibilityTypeOrmQuery implements TechnicianEligibilityQuery {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findEligibleTechnicians(
    requestId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<EligibleTechnicianCandidate[]> {
    const rows = await this.dataSource.query<EligibleTechnicianRow[]>(
      `
        SELECT
          technician.id AS "technicianId",
          technician_user.id AS "userId",
          technician_user.full_name AS "userFullName",
          technician.rating AS "rating",
          technician.daily_assignment_limit AS "dailyAssignmentLimit",
          ARRAY(
            SELECT technician_skill.skill_id
            FROM technician_skills technician_skill
            WHERE technician_skill.technician_id = technician.id
            ORDER BY technician_skill.skill_id
          ) AS "skillIds",
          ARRAY(
            SELECT technician_area.service_area_id
            FROM technician_service_areas technician_area
            WHERE technician_area.technician_id = technician.id
            ORDER BY technician_area.service_area_id
          ) AS "serviceAreaIds",
          (
            SELECT COUNT(*)
            FROM assignments workload_assignment
            WHERE workload_assignment.technician_id = technician.id
              AND workload_assignment.status = ANY($4::assignment_status[])
          ) AS "activeAssignmentCount"
        FROM technicians technician
        INNER JOIN users technician_user ON technician_user.id = technician.user_id
        INNER JOIN service_requests request ON request.id = $1
        INNER JOIN customer_addresses request_address ON request_address.id = request.address_id
        WHERE technician.status = 'active'
          AND EXISTS (
            SELECT 1
            FROM technician_service_areas technician_area
            WHERE technician_area.technician_id = technician.id
              AND technician_area.service_area_id = request_address.service_area_id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM service_request_required_skills required_skill
            WHERE required_skill.service_request_id = request.id
              AND NOT EXISTS (
                SELECT 1
                FROM technician_skills technician_skill
                WHERE technician_skill.technician_id = technician.id
                  AND technician_skill.skill_id = required_skill.skill_id
              )
          )
          AND EXISTS (
            SELECT 1
            FROM technician_availability_windows available_window
            WHERE available_window.technician_id = technician.id
              AND available_window.is_available = true
              AND available_window.starts_at <= $2
              AND available_window.ends_at >= $3
          )
          AND NOT EXISTS (
            SELECT 1
            FROM technician_availability_windows blocked_window
            WHERE blocked_window.technician_id = technician.id
              AND blocked_window.is_available = false
              AND blocked_window.starts_at < $3
              AND blocked_window.ends_at > $2
          )
          AND NOT EXISTS (
            SELECT 1
            FROM assignments overlapping_assignment
            WHERE overlapping_assignment.technician_id = technician.id
              AND overlapping_assignment.status = ANY($4::assignment_status[])
              AND overlapping_assignment.starts_at < $3
              AND overlapping_assignment.ends_at > $2
          )
        ORDER BY
          "activeAssignmentCount" ASC,
          technician.rating DESC NULLS LAST,
          technician_user.full_name ASC,
          technician.id ASC
      `,
      [requestId, startsAt, endsAt, [...ACTIVE_ASSIGNMENT_STATUSES]],
    );

    return rows.map((row) => TechnicianEligibilityMapper.toCandidate(row));
  }
}
