import 'reflect-metadata';

import { DataSource } from 'typeorm';

import { appConfig } from '../config/app.config';
import { createTypeOrmDataSourceOptions } from './typeorm-options';

const config = appConfig();

export default new DataSource(createTypeOrmDataSourceOptions(config.database));
