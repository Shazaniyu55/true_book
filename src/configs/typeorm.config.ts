import { registerAs } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';

import 'reflect-metadata';

import { config as dotenvConfig } from 'dotenv';

// We don't have access to the @nestjs/config module when running the
// migrations, so we need to load the environment variables manually.
dotenvConfig();
export const dataSource = {
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  autoLoadEntities: true,
  synchronize: false,
  type: 'postgres' as const, 
  //type: process.env.DB_TYPE,
  logging: process.env.DATABASE_LOGGING === 'true',
  migrationsTransactionMode: 'each',
  entities: ['dist/**/*.entity.{js,ts}'],
  migrationsRun: process.env.NODE_ENV === 'test',
  dropSchema: process.env.NODE_ENV === 'test',
  migrationsTableName: 'migrations',
  migrations: ['dist/migrations/**/*{.ts,.js}'],
  retryAttempts: parseInt(process.env.DATABASE_RETRY_ATTEMPTS),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false, // ← changed
//   ssl: {
//   rejectUnauthorized: false,
// },
};
// export const dataSource = {
//   database: process.env.DB_NAME,
//   host: process.env.DB_HOST,
//   port: parseInt(process.env.DB_PORT, 10),
//   username: process.env.DB_USER,
//   password: process.env.DB_PASS,
//   autoLoadEntities: true,
//   synchronize: false,
//   type: process.env.DB_TYPE,
//   logging: process.env.DATABASE_LOGGING === 'true',
//   migrationsTransactionMode: 'each',
//   entities: ['dist/**/*.entity.{js,ts}'],
//   migrationsRun: process.env.NODE_ENV === 'test',
//   dropSchema: process.env.NODE_ENV === 'test',
//   migrationsTableName: 'migrations',
//   migrations: ['dist/migrations/**/*{.ts,.js}'],
//   retryAttempts: parseInt(process.env.DATABASE_RETRY_ATTEMPTS),
//   ssl:
//     process.env.NODE_ENV === 'local'
//       ? true
//       : {
//           rejectUnauthorized: false, // Optional, depending on your SSL certificate setup
//         },
// };
export default registerAs('typeorm', () => dataSource);

export const connectionSource = new DataSource(dataSource as DataSourceOptions);
