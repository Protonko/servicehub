import { Technician } from '../model';

export const TECHNICIAN_REPOSITORY = Symbol('TECHNICIAN_REPOSITORY');

export interface TechnicianRepository {
  save(technician: Technician): Promise<Technician>;
  findById(id: string): Promise<Technician | null>;
  findByUserId(userId: string): Promise<Technician | null>;
}
