import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TechnicianManagementReadQuery } from '@application/queries/technician-management-read.query';
import { TechnicianManagementListItem } from '@application/read-models';
import { TechnicianEntity } from '@db/entities/technician.entity';

import { TechnicianManagementReadMapper } from './technician-management-read.mapper';
import { TechnicianManagementRow } from './technician-management-read.types';

@Injectable()
export class TechnicianManagementTypeOrmReadQuery implements TechnicianManagementReadQuery {
  constructor(
    @InjectRepository(TechnicianEntity)
    private readonly technicianRepository: Repository<TechnicianEntity>,
  ) {}

  async listTechnicians(): Promise<TechnicianManagementListItem[]> {
    const rows = await this.technicianRepository
      .createQueryBuilder('technician')
      .innerJoin('technician.user', 'user')
      .select([
        'technician.id AS "id"',
        'user.id AS "userId"',
        'user.email AS "userEmail"',
        'user.full_name AS "userFullName"',
        'technician.status AS "status"',
        'technician.daily_assignment_limit AS "dailyAssignmentLimit"',
        'technician.rating AS "rating"',
        'technician.created_at AS "createdAt"',
        'technician.updated_at AS "updatedAt"',
      ])
      .addSelect(
        `COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object('id', skill.id, 'code', skill.code, 'name', skill.name)
            ORDER BY skill.name, skill.id
          )
          FROM technician_skills technician_skill
          INNER JOIN skills skill ON skill.id = technician_skill.skill_id
          WHERE technician_skill.technician_id = technician.id
        ), '[]'::jsonb)`,
        'skills',
      )
      .addSelect(
        `COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object('id', service_area.id, 'code', service_area.code, 'name', service_area.name)
            ORDER BY service_area.name, service_area.id
          )
          FROM technician_service_areas technician_service_area
          INNER JOIN service_areas service_area
            ON service_area.id = technician_service_area.service_area_id
          WHERE technician_service_area.technician_id = technician.id
        ), '[]'::jsonb)`,
        'serviceAreas',
      )
      .orderBy('user.full_name', 'ASC')
      .addOrderBy('technician.id', 'ASC')
      .getRawMany<TechnicianManagementRow>();

    return rows.map((row) => TechnicianManagementReadMapper.toListItem(row));
  }
}
