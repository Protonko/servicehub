import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppConfig } from '../config/app.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => ({
        type: 'postgres',
        host: configService.get('database.host', { infer: true }),
        port: configService.get('database.port', { infer: true }),
        username: configService.get('database.user', { infer: true }),
        password: configService.get('database.password', { infer: true }),
        database: configService.get('database.name', { infer: true }),
        ssl: configService.get('database.ssl', { infer: true }),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: configService.get('database.migrationsRun', {
          infer: true,
        }),
        migrations: ['dist/src/db/migrations/*.js'],
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
