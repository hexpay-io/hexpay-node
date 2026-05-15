/**
 * Paginate through payments with cursor-based pagination.
 *
 * If the response contains `cursor`, pass it as the `cursor` query param to
 * fetch the next page. Absence of `cursor` in the response means the current
 * page is the last one.
 *
 * Run:
 *   export HEXPAY_TOKEN="..."
 *   pnpm tsx examples/listPayments.ts
 */
import { client } from '../src/client.gen.js';
import { listPayments } from '../src/index.js';

const token = process.env.HEXPAY_TOKEN;
if (!token) {
  console.error('HEXPAY_TOKEN env var is required');
  process.exit(1);
}

client.setConfig({
  baseUrl: 'https://api.hexpay.io',
  auth: () => token,
});

let cursor: string | undefined;
let pageNo = 0;
let totalSeen = 0;

do {
  pageNo += 1;
  const { data, error, response } = await listPayments({
    query: {
      limit: 50,
      cursor,
      // Filter by one or more statuses; omit for all statuses.
      status: ['pending', 'completed'],
    },
  });

  if (error) {
    console.error(`List failed on page ${pageNo} (HTTP ${response.status}):`, error);
    process.exit(1);
  }

  for (const p of data.payments) {
    console.log(`${p.id}  ${p.status.padEnd(10)}  ${p.amount} ${p.currency}  ${p.order_id ?? '-'}`);
  }
  totalSeen += data.payments.length;

  cursor = data.cursor;
} while (cursor);

console.log(`\nFetched ${totalSeen} payment(s) across ${pageNo} page(s).`);
