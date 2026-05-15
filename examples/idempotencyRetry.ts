/**
 * Canonical idempotency-retry pattern.
 *
 * Two rules that this example exists to demonstrate:
 *
 *   1. Generate ONE idempotency key per logical operation, OUTSIDE the retry
 *      loop. Reuse it across every attempt. The server uses this key to
 *      deduplicate, so a network blip on attempt 1 followed by a successful
 *      attempt 2 results in exactly one payment created.
 *
 *   2. Retry ONLY on transient failures: network errors (transport-level
 *      rejection), HTTP 429 (rate-limited), and HTTP 5xx (server-side
 *      transient). Honor the `Retry-After` header when present, otherwise
 *      use exponential backoff with jitter.
 *
 * A fresh randomUUID() inside the loop = bug. It defeats the entire purpose
 * of idempotency and can result in duplicate payments.
 *
 * Run:
 *   export HEXPAY_TOKEN="..."
 *   pnpm tsx examples/idempotencyRetry.ts
 */
import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { client } from '../src/client.gen.js';
import { createPayment } from '../src/index.js';

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 16_000;

const token = process.env.HEXPAY_TOKEN;
if (!token) {
  console.error('HEXPAY_TOKEN env var is required');
  process.exit(1);
}

client.setConfig({
  baseUrl: 'https://api.hexpay.io',
  auth: () => token,
});

// RULE 1: generate ONCE, before the loop.
const idempotencyKey = randomUUID();

const body = {
  amount: '100.00',
  currency: 'USD',
  payment_options: { methods: [{ coin: 'USDT', chain: 'TON' }] },
  order_id: `order-${Date.now()}`,
} as const;

function backoffMs(attempt: number, retryAfterHeader: string | null): number {
  if (retryAfterHeader) {
    const seconds = Number.parseInt(retryAfterHeader, 10);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.min(seconds * 1_000, MAX_DELAY_MS);
    }
  }
  const exp = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
  const jitter = Math.floor(Math.random() * 250);
  return exp + jitter;
}

let lastErr: unknown;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  try {
    const { data, error, response } = await createPayment({
      body,
      // RULE 1 (continued): same key on every attempt.
      headers: { 'X-Idempotency-Key': idempotencyKey },
    });

    if (!error) {
      console.log(`Success on attempt ${attempt}: ${data.id} (${data.status})`);
      process.exit(0);
    }

    // RULE 2: retry only on transient HTTP statuses.
    const transient = response.status === 429 || response.status >= 500;
    if (!transient) {
      console.error(`Non-transient error (HTTP ${response.status}):`, error);
      process.exit(2);
    }

    lastErr = error;
    if (attempt < MAX_ATTEMPTS) {
      const delay = backoffMs(attempt, response.headers.get('retry-after'));
      console.warn(
        `Transient error (HTTP ${response.status}) on attempt ${attempt}; retrying in ${delay}ms`,
      );
      await sleep(delay);
    }
  } catch (networkErr) {
    // RULE 2 (continued): transport-level errors are transient too.
    lastErr = networkErr;
    if (attempt < MAX_ATTEMPTS) {
      const delay = backoffMs(attempt, null);
      console.warn(`Network error on attempt ${attempt}; retrying in ${delay}ms:`, networkErr);
      await sleep(delay);
    }
  }
}

console.error(`Giving up after ${MAX_ATTEMPTS} attempts. Last error:`, lastErr);
process.exit(3);
