/**
 * Inspect structured errors.
 *
 * Every SDK call resolves to { data, error, response }. Non-2xx responses
 * populate `error` (typed ErrorResponse) and leave `data` undefined; network
 * failures (DNS, refused connection, timeout) reject the promise instead.
 *
 * The error body has the shape:
 *   { error: { type, message, code?, param? } }
 *
 * - `type`    — broad category: invalid_request_error, not_found_error,
 *               rate_limit_error, authentication_error, api_error, ...
 * - `code`    — machine-readable specific code (e.g. `invalid_amount`).
 * - `param`   — name of the offending field, when applicable.
 * - `message` — human-readable description.
 *
 * Run:
 *   export HEXPAY_TOKEN="..."
 *   pnpm tsx examples/errorHandling.ts
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

try {
  const { data, error, response } = await createPayment({
    body: {
      // Intentionally invalid — triggers a 400 invalid_request_error.
      amount: '-1',
      currency: 'USD',
    },
    headers: {
      'X-Idempotency-Key': randomUUID(),
    },
  });

  if (error) {
    const { type, code, param, message } = error.error;
    console.error('API error');
    console.error('  http   :', response.status);
    console.error('  type   :', type);
    console.error('  code   :', code);
    console.error('  param  :', param);
    console.error('  message:', message);

    switch (response.status) {
      case 400:
        // Caller bug — fix the request before retrying.
        process.exit(2);
      case 401:
        // Token missing / invalid / revoked.
        process.exit(3);
      case 404:
        process.exit(4);
      case 429:
        // Transient — retry with backoff (see idempotencyRetry.ts).
        process.exit(5);
      default:
        // 5xx — transient server-side; retry with backoff.
        process.exit(6);
    }
  }

  console.log('Unexpectedly succeeded:', data.id);
} catch (networkErr) {
  // Reached only on transport-level failures (DNS, refused, timeout, abort).
  console.error('Network failure:', networkErr);
  process.exit(7);
}
