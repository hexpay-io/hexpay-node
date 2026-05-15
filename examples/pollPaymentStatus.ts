/**
 * Lightweight polling of /status until a terminal state.
 *
 * The /status endpoint returns only the current status — much cheaper than
 * fetching the full payment object on each tick. Use it for high-frequency
 * polling; switch to getPayment() once you see a terminal state and need
 * full details (e.g. transactionSignatures on `completed`).
 *
 * Terminal states: completed, expired, cancelled.
 *
 * Run:
 *   export HEXPAY_TOKEN="..."
 *   pnpm tsx examples/pollPaymentStatus.ts <paymentID>
 */
import { setTimeout as sleep } from 'node:timers/promises';
import { client } from '../src/client.gen.js';
import { getPaymentStatus } from '../src/index.js';

const TERMINAL = new Set(['completed', 'expired', 'cancelled']);
const POLL_INTERVAL_MS = 3_000;
const MAX_DURATION_MS = 15 * 60 * 1_000;

const token = process.env.HEXPAY_TOKEN;
if (!token) {
  console.error('HEXPAY_TOKEN env var is required');
  process.exit(1);
}

const paymentID = process.argv[2];
if (!paymentID) {
  console.error('Usage: pnpm tsx examples/pollPaymentStatus.ts <paymentID>');
  process.exit(1);
}

client.setConfig({
  baseUrl: 'https://api.hexpay.io',
  auth: () => token,
});

const deadline = Date.now() + MAX_DURATION_MS;

while (Date.now() < deadline) {
  const { data, error, response } = await getPaymentStatus({
    path: { paymentID },
  });

  if (error) {
    console.error(`Status check failed (HTTP ${response.status}):`, error);
    process.exit(1);
  }

  console.log(new Date().toISOString(), 'status:', data.status);

  if (TERMINAL.has(data.status)) {
    process.exit(data.status === 'completed' ? 0 : 2);
  }

  await sleep(POLL_INTERVAL_MS);
}

console.error('Polling timed out before reaching a terminal state');
process.exit(3);
