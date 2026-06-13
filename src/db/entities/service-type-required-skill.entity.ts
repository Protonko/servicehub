import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { ServiceTypeEntity } from './service-type.entity';
import { SkillEntity } from './skill.entity';

@Entity('service_type_required_skills')
export class ServiceTypeRequiredSkillEntity {
  @PrimaryColumn({ name: 'service_type_id', type: 'uuid' })
  serviceTypeId!: string;

  @PrimaryColumn({ name: 'skill_id', type: 'uuid' })
  skillId!: string;

  @ManyToOne(() => ServiceTypeEntity, (serviceType) => serviceType.requiredSkills, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_type_id' })
  serviceType!: ServiceTypeEntity;

  @ManyToOne(() => SkillEntity, (skill) => skill.serviceTypeRequiredSkills, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'skill_id' })
  skill!: SkillEntity;
}
