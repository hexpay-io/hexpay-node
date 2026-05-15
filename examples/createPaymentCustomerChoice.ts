/**
 * Create a payment where the customer picks the coin/chain at checkout.
 *
 * Omit `payment_options.methods` and the API will offer every method enabled
 * for the store. The payment starts in `created` status; once the customer
 * selects a method, it transitions to `pending` with `paymentDetails` populated.
 *
 * Run:
 *   export HEXPAY_TOKEN="..."
 *   pnpm tsx examples/createPaymentCustomerChoice.ts
 */
import { randomUUID } from 'node:crypto';
import { client } from '../src/client.gen.js';
import { createPayment } from '../src/index.js';

const token = process.env.HEXPAY_TOKEN;
if (!token) {
  console.error('HEXPAY_TOKEN env var is required');
  process.exit(1);
}

client.setConfig({
  baseUrl: 'https://api.hexpay.io',
  auth: () => token,
});

const { data, error, response } = await createPayment({
  body: {
    amount: '100.00',
    currency: 'USD',
    order_id: `order-${Date.now()}`,
    webhookURL: 'https://merchant.example.com/webhooks/hexpay',
  },
  headers: {
    'X-Idempotency-Key': randomUUID(),
  },
});

if (error) {
  console.error(`Payment creation failed (HTTP ${response.status}):`, error);
  process.exit(1);
}

console.log('Created payment:');
console.log('  id:          ', data.id);
console.log('  status:      ', data.status);
console.log('  checkoutURL: ', data.checkoutURL);
