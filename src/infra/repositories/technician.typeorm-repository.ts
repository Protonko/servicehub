import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, QueryFailedError } from 'typeorm';

import { TechnicianServiceAreaEntity } from '@db/entities/technician-service-area.entity';
import { TechnicianSkillEntity } from '@db/entities/technician-skill.entity';
import { TechnicianEntity } from '@db/entities/technician.entity';
import { Technician } from '@domain/model';
import { DuplicateTechnicianProfileError } from '@domain/exceptions';
import { TechnicianRepository } from '@domain/repositories';
import { TechnicianMapper } from '../mappers/technician.mapper';

const technicianRelations = {
  skills: true,
  serviceAreas: true,
} as const;

@Injectable()
export class TechnicianTypeOrmRepository implements TechnicianRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async save(technician: Technician): Promise<Technician> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await manager.getRepository(TechnicianEntity).save(TechnicianMapper.toEntity(technician));
        await this.replaceSkills(manager, technician);
        await this.replaceServiceAreas(manager, technician);

        const savedTechnician = await manager.getRepository(TechnicianEntity).findOneOrFail({
          where: { id: technician.id },
          relations: technicianRelations,
        });

        return TechnicianMapper.toDomain(savedTechnician);
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { constraint?: string }).constraint === 'uq_technicians_user_id'
      ) {
        throw new DuplicateTechnicianProfileError();
      }

      throw error;
    }
  }

  async findById(id: string): Promise<Technician | null> {
    const entity = await this.dataSource.getRepository(TechnicianEntity).findOne({
      where: { id },
      relations: technicianRelations,
    });

    return entity ? TechnicianMapper.toDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<Technician | null> {
    const entity = await this.dataSource.getRepository(TechnicianEntity).findOne({
      where: { userId },
      relations: technicianRelations,
    });

    return entity ? TechnicianMapper.toDomain(entity) : null;
  }

  private async replaceSkills(manager: EntityManager, technician: Technician): Promise<void> {
    const repository = manager.getRepository(TechnicianSkillEntity);

    await repository.delete({ technicianId: technician.id });

    if (technician.skillIds.length > 0) {
      await repository.save(
        technician.skillIds.map((skillId) =>
          repository.create({ technicianId: technician.id, skillId }),
        ),
      );
    }
  }

  private async replaceServiceAreas(manager: EntityManager, technician: Technician): Promise<void> {
    const repository = manager.getRepository(TechnicianServiceAreaEntity);

    await repository.delete({ technicianId: technician.id });
    await repository.save(
      technician.serviceAreaIds.map((serviceAreaId) =>
        repository.create({ technicianId: technician.id, serviceAreaId }),
      ),
    );
  }
}
