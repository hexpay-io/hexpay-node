/**
 * Cancel a payment in `created` or `pending` status.
 *
 * Payments already in a terminal state (`completed`, `expired`, `cancelled`)
 * cannot be cancelled — the API returns 400 `payment_not_cancellable`.
 *
 * Run:
 *   export HEXPAY_TOKEN="..."
 *   pnpm tsx examples/cancelPayment.ts <paymentID>
 */
import { randomUUID } from 'node:crypto';
import { client } from '../src/client.gen.js';
import { cancelPayment } from '../src/index.js';

const token = process.env.HEXPAY_TOKEN;
if (!token) {
  console.error('HEXPAY_TOKEN env var is required');
  process.exit(1);
}

const paymentID = process.argv[2];
if (!paymentID) {
  console.error('Usage: pnpm tsx examples/cancelPayment.ts <paymentID>');
  process.exit(1);
}

client.setConfig({
  baseUrl: 'https://api.hexpay.io',
  auth: () => token,
});

const { data, error, response } = await cancelPayment({
  path: { paymentID },
  headers: {
    'X-Idempotency-Key': randomUUID(),
  },
});

if (error) {
  console.error(`Cancel failed (HTTP ${response.status}):`, error);
  process.exit(1);
}

console.log('status:', data.status);
