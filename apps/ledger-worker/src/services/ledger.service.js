//** What we are doing here ?
//==> 
// ACID transaction(Atomicity(cover in one transaction), Consistency(Database must remain valid after the transaction.), Isolation(LOCK), Durability((Once a transaction is committed, it will remain so, even in the event of power loss, crashes, or errors.)))
// Database-level idempotency using ProcessedEvent
// Webhook event → payment status mapping
// Pessimistic locking using SELECT FOR UPDATE
// Payment state machine (FSM)
// Optimistic-style version counter
// Double-entry ledger — DEBIT Escrow + CREDIT Merchant
// Atomic commit/rollback — payment and ledger changes happen together */


import { sequelize } from '../db/connection.js';
import { ProcessedEvent, Payment, LedgerEntry } from '../db/models.js';
import { canTransition, PaymentStatus } from './stateMachine.service.js';

export async function processPaymentEvent(event) {
  const { eventId, paymentId, eventType, amount, currency } = event;

  // Open an ACID transaction
  try {
    return await sequelize.transaction(async (t) => {

    // ==========================================
    // STEP 1: RELATIONAL IDEMPOTENCY CHECK
    // ==========================================
    // Try to record this event in the database.
    // If the eventId already exists, MySQL throws a duplicate key error.
    try {
      await ProcessedEvent.create(
        { eventId, eventType },
        { transaction: t }
      );
    } catch (err) {
      if (err.name === 'SequelizeUniqueConstraintError') {
        console.warn(`[Deduplication]: Event ${eventId} was already recorded in DB. Skipping.`);
        return { status: 'DUPLICATE_EVENT' };
      }
      throw err;
    }

    // ==========================================
    // STEP 2: MAP WEBHOOK EVENT TO PAYMENT STATUS
    // ==========================================
    let targetStatus;
    if (eventType === 'payment.succeeded') {
      targetStatus = PaymentStatus.SETTLED;
    } else if (eventType === 'payment.failed') {
      targetStatus = PaymentStatus.FAILED;
    } else if (eventType === 'payment.refunded') {
      targetStatus = PaymentStatus.REFUNDED;
    } else {
      targetStatus = PaymentStatus.INITIATED;
    }

    // ==========================================
    // STEP 3: PESSIMISTIC LOCK (SELECT FOR UPDATE)
    // ==========================================
    // Lock the payment row so no other worker can touch this payment
    // until our transaction commits or rolls back.
    const payment = await Payment.findByPk(paymentId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!payment) {
      // First time we encounter this payment: create the initial record
      await Payment.create(
        {
          id: paymentId,
          amount,
          currency,
          status: targetStatus,
          version: 1,
        },
        { transaction: t }
      );
    } else {
      // Validate state transition against the Finite State Machine
      const isValidTransition = canTransition(payment.status, targetStatus);

      if (!isValidTransition) {
        console.warn(
          `[FSM Guard]: Invalid transition from "${payment.status}" to "${targetStatus}". Ignoring event.`
        );
        return { status: 'INVALID_TRANSITION' };
      }

      // Valid transition: advance the state and bump version counter
      payment.status = targetStatus;
      payment.version = payment.version + 1;
      await payment.save({ transaction: t });
    }

    // ==========================================
    // STEP 4: DOUBLE-ENTRY LEDGER ENTRIES
    // ==========================================
    // When a payment settles, create two balancing ledger rows.
    if (targetStatus === PaymentStatus.SETTLED) {
      
      // Line 1: DEBIT Escrow (Money enters platform holding account)
      await LedgerEntry.create(
        {
          paymentId,
          accountId: 'escrow_holding_account',
          entryType: 'DEBIT',
          amount,
          currency,
        },
        { transaction: t }
      );

      // Line 2: CREDIT Merchant (Merchant's available balance increases)
      await LedgerEntry.create(
        {
          paymentId,
          accountId: 'merchant_primary_account',
          entryType: 'CREDIT',
          amount,
          currency,
        },
        { transaction: t }
      );

      console.log(`[Ledger Balanced]: Debited Escrow and Credited Merchant for ${amount} ${currency}`);
    }

    return { status: 'SUCCESS' };
    });
  } catch (err) {
    console.error(`[LedgerService] Failed to process event ${eventId} for payment ${paymentId}:`, err);
    throw err;
  }
}
