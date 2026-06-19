import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { ServiceRequestEntity } from './service-request.entity';
import { SkillEntity } from './skill.entity';

@Entity('service_request_required_skills')
export class ServiceRequestRequiredSkillEntity {
  @PrimaryColumn({ name: 'service_request_id', type: 'uuid' })
  serviceRequestId!: string;

  @PrimaryColumn({ name: 'skill_id', type: 'uuid' })
  skillId!: string;

  @ManyToOne(() => ServiceRequestEntity, (request) => request.requiredSkills, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_request_id' })
  request!: ServiceRequestEntity;

  @ManyToOne(() => SkillEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'skill_id' })
  skill!: SkillEntity;
}
