import { createTypeOrmDataSourceOptions, createTypeOrmModuleOptions } from '../typeorm-options';

const databaseConfig = {
  host: 'db.example.local',
  port: 5433,
  user: 'servicehub_user',
  password: 'servicehub_password',
  name: 'servicehub_test',
  ssl: false,
  migrationsRun: false,
};

describe('TypeORM database options', () => {
  it('creates NestJS module options with migrations disabled by default', () => {
    const options = createTypeOrmModuleOptions(databaseConfig);

    expect(options).toMatchObject({
      type: 'postgres',
      host: 'db.example.local',
      port: 5433,
      username: 'servicehub_user',
      password: 'servicehub_password',
      database: 'servicehub_test',
      ssl: false,
      synchronize: false,
      autoLoadEntities: true,
      migrationsRun: false,
    });
    expect(options.migrations).toEqual([expect.stringContaining('/migrations/*{.ts,.js}')]);
  });

  it('creates CLI data source options without NestJS-only options', () => {
    const options = createTypeOrmDataSourceOptions(databaseConfig);

    expect(options).toMatchObject({
      type: 'postgres',
      host: 'db.example.local',
      port: 5433,
      username: 'servicehub_user',
      password: 'servicehub_password',
      database: 'servicehub_test',
      ssl: false,
      synchronize: false,
      entities: [],
    });
    expect(options).not.toHaveProperty('autoLoadEntities');
    expect(options).not.toHaveProperty('migrationsRun');
  });
});
