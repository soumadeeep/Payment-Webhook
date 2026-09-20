import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

export const sequelize = new Sequelize(
  process.env.DB_NAME || 'fintech_ledger',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    dialect: 'mysql',
    logging: false, // Set to console.log to inspect generated SQL queries
    pool: {
      max: 10,       // Max physical connections managed
      min: 2,        // Minimum idle connections maintained
      acquire: 30000,
      idle: 10000,
    },
  }
);