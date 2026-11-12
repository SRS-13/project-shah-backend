import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity.js';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'teamflow',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE ?? 'teamflow_db',

  entities: [User],
  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
});

export default AppDataSource;