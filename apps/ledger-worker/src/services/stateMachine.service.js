export const PaymentStatus = {
  INITIATED: 'INITIATED',
  SETTLED: 'SETTLED',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
};

// Strict directed state transition map
const STATE_TRANSITIONS = {
  [PaymentStatus.INITIATED]: [PaymentStatus.SETTLED, PaymentStatus.FAILED],
  [PaymentStatus.SETTLED]: [PaymentStatus.REFUNDED],
  [PaymentStatus.FAILED]: [],    // Terminal state: No transitions allowed
  [PaymentStatus.REFUNDED]: [],  // Terminal state: No transitions allowed
};

export function canTransition(currentStatus, targetStatus) {
  if (!currentStatus) return true; // Initial creation
  if (currentStatus === targetStatus) return false; // Redundant update

  const allowedNext = STATE_TRANSITIONS[currentStatus] || [];
  return allowedNext.includes(targetStatus);
}