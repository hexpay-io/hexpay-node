/**
 * Retrieve the full details of a payment by ID.
 *
 * Run:
 *   export HEXPAY_TOKEN="..."
 *   pnpm tsx examples/retrievePayment.ts <paymentId>
 */
import { client } from '../src/client.gen.js';
import { getPayment } from '../src/index.js';

const token = process.env.HEXPAY_TOKEN;
if (!token) {
  console.error('HEXPAY_TOKEN env var is required');
  process.exit(1);
}

const paymentId = process.argv[2];
if (!paymentId) {
  console.error('Usage: pnpm tsx examples/retrievePayment.ts <paymentId>');
  process.exit(1);
}

client.setConfig({
  baseUrl: 'https://api.hexpay.io',
  auth: () => token,
});

const { data, error, response } = await getPayment({
  path: { paymentId },
});

if (error) {
  console.error(`Failed to fetch payment (HTTP ${response.status}):`, error);
  process.exit(1);
}

console.log(JSON.stringify(data, null, 2));
