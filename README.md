# HexPay Node.js SDK

Official Node.js / TypeScript SDK for the [HexPay](https://hexpay.io) Merchant API.
Accept TON-ecosystem cryptocurrency payments (TON, USDT-TON, NOT, DOGS, and more)
with a typed, fully-generated client.

The entire `src/` folder is auto-generated from the OpenAPI specification at
[`oapi/api.yaml`](oapi/api.yaml) using [`@hey-api/openapi-ts`](https://heyapi.dev).
**Never edit `src/` by hand** — changes are overwritten on the next regeneration.

## Installation

Latest stable release from npm:

```bash
npm install @hexpay/sdk
# or
pnpm add @hexpay/sdk
# or
yarn add @hexpay/sdk
```

Pin to a specific version (recommended for production — see
[Releases](https://github.com/hexpay-io/hexpay-node/releases) for available tags):

```bash
npm install @hexpay/sdk@0.0.1
```

Or install straight from the repo — `main` for the latest commit, or any tag:

```bash
npm install github:hexpay-io/hexpay-node
npm install github:hexpay-io/hexpay-node#v0.0.1
```

## Quickstart

```ts
import { randomUUID } from 'node:crypto';
import { createPayment } from '@hexpay/sdk';
import { client } from '@hexpay/sdk/client';

client.setConfig({
  auth: () => process.env.HEXPAY_TOKEN!,
});

const { data, error } = await createPayment({
  body: {
    amount: '100.00',
    currency: 'USD',
    order_id: 'order-2026-00123',
  },
  headers: {
    'X-Idempotency-Key': randomUUID(),
  },
});

if (error) {
  console.error('Payment creation failed:', error);
  process.exit(1);
}

console.log('Created payment', data.id, '→', data.checkoutURL);
```

## Authentication

Every request to the HexPay Merchant API must be authenticated with a JWT issued
from the **merchant dashboard**. Pass it as a bearer token via the SDK's
`client.setConfig({ auth })` callback.

**Never hardcode the token.** Read it from an environment variable
(`process.env.HEXPAY_TOKEN`), a secrets manager, or your platform's secret store.
All example scripts in this repo expect `HEXPAY_TOKEN` to be set.

```bash
export HEXPAY_TOKEN="eyJhbGciOi..."
```

The token is sent as `Authorization: Bearer <token>` on every request. If it is
missing or invalid, the API returns `401 Unauthorized`.

## Idempotency

Every `POST` request (currently `createPayment` and `cancelPayment`) **requires**
an `X-Idempotency-Key` header containing a **UUID v4**. The server uses this key
to deduplicate retried requests, so a transient network failure cannot turn into
a duplicate payment.

Two rules — internalize both:

1. **Generate a fresh key for each new logical operation.** Use
   `crypto.randomUUID()` (Node 18+) once per operation, then forget about it.
2. **Reuse the same key when retrying a failed request.** The server returns the
   cached response from the first attempt instead of creating a duplicate
   payment. Generating a fresh UUID *inside* a retry loop is a bug — it defeats
   the entire purpose of idempotency.

See [`examples/idempotencyRetry.ts`](examples/idempotencyRetry.ts) for the
canonical retry pattern with exponential backoff and `Retry-After` support.

## Async / Promises

Every SDK function returns a `Promise<{ data, error, response }>`. Use `await` in
an async function (or top-level in an ES module) and inspect `error` before
touching `data`:

```ts
const { data, error, response } = await getPayment({
  path: { paymentID: 'abc-123' },
});

if (error) {
  // `error` is a typed ErrorResponse; `response` is the raw Fetch Response
  console.error(response.status, error);
  return;
}

// `data` is fully typed
console.log(data.status);
```

There is no separate "sync" entry point — Node.js fetch is async only. This is
the equivalent of the `asyncio` variant in the Python SDK.

## Examples

All examples live in [`examples/`](examples/) and read `HEXPAY_TOKEN` from the
environment. Run any of them with `tsx`:

```bash
export HEXPAY_TOKEN="eyJhbGciOi..."
pnpm tsx examples/createPayment.ts
```

| Script | Description |
|---|---|
| [`createPaymentCustomerChoice.ts`](examples/createPaymentCustomerChoice.ts) | Create a payment where the customer picks the coin/chain at checkout |
| [`createPaymentPreselected.ts`](examples/createPaymentPreselected.ts) | Create a payment with a preselected coin/chain — returns a deposit address immediately |
| [`retrievePayment.ts`](examples/retrievePayment.ts) | Fetch the full details of a payment by ID |
| [`pollPaymentStatus.ts`](examples/pollPaymentStatus.ts) | Lightweight polling of the `/status` endpoint until a terminal state |
| [`listPayments.ts`](examples/listPayments.ts) | Paginate through payments with cursor-based pagination and optional status filtering |
| [`listPaymentMethods.ts`](examples/listPaymentMethods.ts) | List all payment methods enabled for the store |
| [`cancelPayment.ts`](examples/cancelPayment.ts) | Cancel a payment in `created` or `pending` status |
| [`errorHandling.ts`](examples/errorHandling.ts) | Inspect structured `error.code` / `error.type` / HTTP status |
| [`idempotencyRetry.ts`](examples/idempotencyRetry.ts) | Canonical retry pattern — one UUID before the loop, exponential backoff, `Retry-After` support |

## Regeneration

The `src/` folder is generated from `oapi/api.yaml` via Docker — no Node toolchain
on the host is required:

```bash
make gen
```

This builds the generator image from [`gen.Dockerfile`](gen.Dockerfile)
(pinned `@hey-api/openapi-ts` version), removes the existing `src/`, and
regenerates it. The result is committed to the repo so that consumers installing
via npm receive a ready package.

CI runs `make gen` automatically on every push to a non-`main` branch when
`oapi/**`, `gen.Dockerfile`, `Makefile`, `openapi-ts.config.ts`, or
`.github/workflows/generate.yml` change, and commits the result back to the
branch with `chore: regenerate sdk`. PRs into `main` are merged manually after
review.

## Compatibility

- **Node.js** ≥ 18 (uses the global `fetch`, `crypto.randomUUID`).
- **TypeScript** ≥ 5.0 — strict mode supported; types ship as `.d.ts`.
- **Module formats**: dual ESM + CommonJS. The `exports` map resolves the right
  format automatically based on how you import.
- **Bun** and **Deno** — should work via npm specifiers but are not tested in CI.

## Releasing

Releases are triggered by pushing a `v*` tag matching the version in
`package.json`. The [`release.yml`](.github/workflows/release.yml) workflow
verifies the match (and fails if not), builds, and publishes to npm via npm's
Trusted Publishing (OIDC).
