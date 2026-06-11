import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppConfig } from '../config/app.config';
import { createTypeOrmModuleOptions } from './typeorm-options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) =>
        createTypeOrmModuleOptions(configService.get('database', { infer: true })),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
