/**
 * Shared status-transition state machine for LaundryRequest.
 *
 * Single source of truth — imported by:
 *   - routes/requests.js  (HTTP PATCH /:id/status)
 *   - index.js            (Socket.IO request:update handler)
 *
 * Full provider workflow:
 *   accepted → picked_up → washing → ready → out_for_delivery → delivered
 */

export const VALID_TRANSITIONS = {
  accepted:        ['picked_up'],
  picked_up:       ['washing'],
  washing:         ['ready'],
  ready:           ['out_for_delivery'],
  out_for_delivery: ['delivered'],
};

/**
 * Returns the allowed next statuses for a given current status.
 * Returns an empty array if no transitions are defined.
 *
 * @param {string} currentStatus
 * @returns {string[]}
 */
export const allowedTransitions = (currentStatus) =>
  VALID_TRANSITIONS[currentStatus] ?? [];

/**
 * Returns true if transitioning from currentStatus to nextStatus is valid.
 *
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @returns {boolean}
 */
export const isValidTransition = (currentStatus, nextStatus) =>
  (VALID_TRANSITIONS[currentStatus] ?? []).includes(nextStatus);
