import { DataTypes } from 'sequelize';
import { sequelize } from './connection.js';

// 1. Relational Idempotency Record
export const ProcessedEvent = sequelize.define('ProcessedEvent', {
  eventId: {
    type: DataTypes.STRING(64),
    primaryKey: true,
    field: 'event_id',
  },
  eventType: {
    type: DataTypes.STRING(64),
    allowNull: false,
    field: 'event_type',
  },
}, {
  tableName: 'processed_events',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});

// 2. Payments (Finite State Machine Tracking)
export const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.STRING(64),
    primaryKey: true,
  },
  amount: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'payments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

// 3. Double-Entry Immutable Ledger
export const LedgerEntry = sequelize.define('LedgerEntry', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },
  paymentId: {
    type: DataTypes.STRING(64),
    allowNull: false,
    field: 'payment_id',
  },
  accountId: {
    type: DataTypes.STRING(64),
    allowNull: false,
    field: 'account_id',
  },
  entryType: {
    type: DataTypes.ENUM('DEBIT', 'CREDIT'),
    allowNull: false,
    field: 'entry_type',
  },
  amount: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
  },
}, {
  tableName: 'ledger_entries',
  timestamps: true,
  updatedAt: false,
  createdAt: 'created_at',
});

Payment.hasMany(LedgerEntry, { foreignKey: 'payment_id' });
LedgerEntry.belongsTo(Payment, { foreignKey: 'payment_id' });