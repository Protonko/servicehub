import { MigrationInterface } from 'typeorm';

export class DatabaseFoundation1781160000000 implements MigrationInterface {
  name = 'DatabaseFoundation1781160000000';

  public async up(): Promise<void> {
    // Baseline migration proves the migration pipeline before business tables exist.
  }

  public async down(): Promise<void> {
    // No schema changes are made by this baseline migration.
  }
}
