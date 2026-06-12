import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

import { AppConfig } from '@config/app.config';

type DatabaseConfig = AppConfig['database'];

const migrationsGlob = `${__dirname}/migrations/*{.ts,.js}`;

const createBaseOptions = (database: DatabaseConfig): DataSourceOptions => ({
  type: 'postgres',
  host: database.host,
  port: database.port,
  username: database.user,
  password: database.password,
  database: database.name,
  ssl: database.ssl,
  synchronize: false,
  migrations: [migrationsGlob],
  entities: [],
});

export const createTypeOrmModuleOptions = (database: DatabaseConfig): TypeOrmModuleOptions => ({
  ...createBaseOptions(database),
  autoLoadEntities: true,
  migrationsRun: database.migrationsRun,
});

export const createTypeOrmDataSourceOptions = (database: DatabaseConfig): DataSourceOptions =>
  createBaseOptions(database);
