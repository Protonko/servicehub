import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import { SkillEntity } from './skill.entity';
import { TechnicianEntity } from './technician.entity';

@Entity('technician_skills')
export class TechnicianSkillEntity {
  @PrimaryColumn({ name: 'technician_id', type: 'uuid' })
  technicianId!: string;

  @PrimaryColumn({ name: 'skill_id', type: 'uuid' })
  skillId!: string;

  @ManyToOne(() => TechnicianEntity, (technician) => technician.skills, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'technician_id' })
  technician!: TechnicianEntity;

  @ManyToOne(() => SkillEntity, (skill) => skill.technicianSkills, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'skill_id' })
  skill!: SkillEntity;
}
