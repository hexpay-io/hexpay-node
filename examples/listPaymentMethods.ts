/**
 * List all payment methods enabled for the store.
 *
 * Each entry is a unique coin + chain combination. Use the `coin.symbol` and
 * `chain.symbol` values when populating `payment_options.methods` on
 * createPayment().
 *
 * Run:
 *   export HEXPAY_TOKEN="..."
 *   pnpm tsx examples/listPaymentMethods.ts
 */
import { client } from '../src/client.gen.js';
import { listPaymentMethods } from '../src/index.js';

const token = process.env.HEXPAY_TOKEN;
if (!token) {
  console.error('HEXPAY_TOKEN env var is required');
  process.exit(1);
}

client.setConfig({
  baseUrl: 'https://api.hexpay.io',
  auth: () => token,
});

const { data, error, response } = await listPaymentMethods();

if (error) {
  console.error(`Failed to list payment methods (HTTP ${response.status}):`, error);
  process.exit(1);
}

if (data.data.length === 0) {
  console.log('No payment methods enabled for this store.');
  process.exit(0);
}

console.log('Enabled payment methods:');
for (const m of data.data) {
  console.log(`  ${m.coin.symbol.padEnd(8)} on ${m.chain.symbol.padEnd(6)}  (${m.id})`);
}
