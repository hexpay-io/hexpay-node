/**
 * Create a payment with a preselected coin/chain.
 *
 * Pass exactly one entry in `payment_options.methods` with both `coin` and
 * `chain`. The server resolves the deposit address immediately and returns
 * the payment in `pending` status with `paymentDetails` populated — the
 * customer skips the method-selection screen.
 *
 * Run:
 *   export HEXPAY_TOKEN="..."
 *   pnpm tsx examples/createPaymentPreselected.ts
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
    payment_options: {
      methods: [{ coin: 'USDT', chain: 'TON' }],
    },
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

if (data.paymentDetails) {
  console.log('  address:     ', data.paymentDetails.address);
  console.log('  coinAmount:  ', data.paymentDetails.coinAmount);
  console.log('  coin/chain:  ', data.paymentDetails.coin.symbol, '/', data.paymentDetails.chain.symbol);
}
