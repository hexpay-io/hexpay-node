# CLAUDE.md

Guidance for Claude Code (and other LLM assistants) working on this repository.

## What this repo is

This is the **HexPay Merchant API SDK for Node.js / TypeScript** — an idiomatic
Node port of [`hexpay-python`](https://github.com/hexpay-io/hexpay-python).

The entire client lives under `src/` and is **fully auto-generated** from the
OpenAPI specification at `oapi/api.yaml` using
[`@hey-api/openapi-ts`](https://heyapi.dev). The `src/` directory is committed
to git so that consumers installing via npm receive a ready-to-use package, but
**it must never be edited by hand** — any manual change is overwritten on the
next `make gen`.

What you *do* edit:

- `oapi/api.yaml` — the OpenAPI spec, source of truth for every endpoint and type.
- `openapi-ts.config.ts` — generator configuration (plugins, naming, output).
- `gen.Dockerfile` — pinned generator version and its base image.
- `examples/` — hand-written usage examples.
- `package.json`, `tsconfig.json`, `tsup.config.ts`, workflows — packaging,
  build, and CI.

## Common commands

All build/regeneration commands go through the Makefile. Docker is the only
runtime requirement for code generation — no host Node toolchain is needed for
`make gen`.

```bash
make gen       # Rebuild src/ from oapi/api.yaml inside Docker
make install   # pnpm install
make build     # Build dual ESM+CJS bundle into dist/ (via tsup)
make lint      # Lint examples/ (src/ is excluded)
make format    # Prettier-format examples/
make clean     # Remove src/, node_modules/, dist/
```

Run a single example after `pnpm install` and `make gen`:

```bash
export HEXPAY_TOKEN="eyJhbGciOi..."
pnpm tsx examples/createPayment.ts
```

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `chore:` — tooling, dependencies, CI noise, regeneration
- `docs:` — documentation only
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `test:` — adding or correcting tests
- `ci:` — CI configuration
- `build:` — build system or external dependencies

Breaking changes — append `!` after the type (e.g. `feat!: rename field`) **or**
include a `BREAKING CHANGE:` footer. Either triggers a SemVer major bump.

The CI auto-commit for regenerated SDK code always uses the message
`chore: regenerate sdk`.

## Regeneration flow

1. Edit `oapi/api.yaml` (or `openapi-ts.config.ts` / `gen.Dockerfile`).
2. Run `make gen` locally to materialize `src/`, **or** push to a non-`main`
   branch and let CI do it for you.
3. Review the diff in `src/`. If something looks wrong, the fix is in the spec
   or generator config — not in `src/`.
4. Commit. If you ran `make gen` locally, include the regenerated `src/` in the
   same commit.

The Docker image is rebuilt from `gen.Dockerfile` on every `make gen`. The
generator version is pinned by the `OPENAPI_TS_VERSION` build arg (currently
`0.97.1`). Bumping it = edit the default in `Makefile` + `gen.Dockerfile` and
regenerate.

## CI behavior

Two workflows under `.github/workflows/`:

- **`generate.yml`** — fires on push to any non-`main` branch when `oapi/**`,
  `openapi-ts.config.ts`, `gen.Dockerfile`, `Makefile`, or the workflow file
  itself change. It rebuilds the Docker image (with GHA layer cache), runs
  `make gen`, and auto-commits the result with `chore: regenerate sdk`. The
  `paths` filter intentionally excludes `src/**` so the auto-commit doesn't
  re-trigger the workflow into a loop.
- **`release.yml`** — fires on push of a `v*` tag. It verifies the tag matches
  `package.json#version` (exits 1 if not), builds, and publishes to npm using
  Trusted Publishing (OIDC). No `NPM_TOKEN` is stored as a repo secret — that's
  intentional; see the workflow file for the fallback config.

## Idempotency contract

`POST` requests (`createPayment`, `cancelPayment`) **optionally** accept an
`X-Idempotency-Key` header containing a UUID. In the generated SDK
this header is passed via the `headers` object of each operation's options:

```ts
import { randomUUID } from 'node:crypto';

await createPayment({
  body: { ... },
  headers: { 'X-Idempotency-Key': randomUUID() },
});
```

Two non-negotiable rules:

1. **Fresh UUID per logical operation.** One `randomUUID()` call per intent to
   create or cancel a payment.
2. **Same UUID across retries of the same operation.** Generate the key *once
   outside* any retry loop. A fresh UUID inside the loop = lost idempotency =
   potential duplicate payments on transient errors.

The canonical example is `examples/idempotencyRetry.ts` — read it before adding
any new retry logic anywhere.

## `@hey-api/openapi-ts` peculiarities to know

The generator's output has a few quirks worth knowing when reading `src/`:

- **Operation names** come straight from `operationId` in the spec — camelCase
  (`createPayment`, `getPaymentStatus`). No prefix, no service grouping.
- **Header parameters** are exposed via the `headers` field of each operation's
  options, typed as a literal object — e.g. `{ 'X-Idempotency-Key': string }`.
  This differs from the Python SDK, where the header becomes a named keyword
  argument. The HTTP-name (`X-Idempotency-Key`) is preserved as-is.
- **Optional fields** are declared as `field?: T` (not `field: T | undefined`).
  Reading an absent optional yields `undefined`.
- **The fetch client** comes from `@hey-api/client-fetch` (a runtime dependency).
  The generated `src/client.gen.ts` exports a singleton `client` instance with
  `baseUrl` already populated from the spec's `servers[0]`. It is **not**
  re-exported from `src/index.ts` — hey-api keeps it on a separate subpath so
  the runtime client can be swapped out. Consumers import it as
  `import { client } from '@hexpay/sdk/client'`; in-repo examples use the
  relative path `'../src/client.gen.js'`. Configure once at startup via
  `client.setConfig({ auth })`.
- **Return shape** of every SDK function is `Promise<{ data, error, response }>`.
  `data` is the success body, `error` is the typed error body, `response` is the
  raw Fetch `Response`. Exactly one of `data` / `error` is populated. Always
  check `error` first.
- **No throwing on HTTP errors.** Non-2xx responses populate `error` and resolve
  the promise normally. Network errors (DNS, connection refused, timeouts)
  reject the promise — wrap calls in `try/catch` if you need to handle them
  alongside `error`.
- **Enums** become string-literal union types (e.g. `'created' | 'pending' |
  'completed' | 'expired' | 'cancelled'`), not real `enum` declarations.
- **Reserved-word collisions** are rare in practice but get a trailing underscore
  in the generated identifier when they happen.

## Files you'll most often touch

| Path | When |
|---|---|
| `oapi/api.yaml` | Adding or changing endpoints, request/response schemas |
| `examples/*.ts` | Documenting a new flow or fixing example drift |
| `openapi-ts.config.ts` | Tweaking generator plugins, naming, output layout |
| `gen.Dockerfile` | Bumping the generator version |
| `package.json` | Releasing a new version (the tag must match `version`) |
| `README.md` | Public-facing docs |
| `.github/workflows/*.yml` | CI changes |

## Files you must NOT touch by hand

- Anything inside `src/` — overwritten on every `make gen`. Fix the cause
  (spec or generator config), not the symptom.
- `dist/` — build output. Generated by `pnpm build`, gitignored.
- `node_modules/` — dependencies. Generated by `pnpm install`, gitignored.
