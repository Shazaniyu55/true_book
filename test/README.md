# Test suite

## Where files go

```
jest.config.ts                ← project ROOT (not inside test/)
test/
  modules/
    auth/auth.service.spec.ts
    passenger/payment.service.spec.ts
    driver/payout.service.spec.ts
    appversion/app-version.service.spec.ts
  e2e/
    auth.e2e-spec.ts
```

`jest.config.ts` must sit at the repo root — Jest looks for it there. Everything
else lives under `test/`, mirroring the `src/` layout.

## package.json scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --testRegex='\\.e2e-spec\\.ts$'"
  }
}
```

`npm test` runs every spec + e2e under `test/`.

## Cleanup before running

- Delete the old `test/app.e2e-spec.ts` — it asserts `GET /` returns
  "Hello World!", but this app has no root route, so it will always fail.
- Delete `test/jest-e2e.json` — `jest.config.ts` now covers e2e too.
- If you keep an inline `"jest"` block in `package.json`, remove it so the two
  configs don't conflict.

## What's covered and why

- **payment.service.spec.ts** — the `verifyPayment` re-verify + amount-mismatch
  guard. Highest value: this is the money path that must never confirm an
  underpayment.
- **payout.service.spec.ts** — `completePayout` idempotency (the webhook claim).
- **auth.service.spec.ts** — every `login` rejection branch + the success path.
- **app-version.service.spec.ts** — clean single-repo example of the mock pattern.
- **e2e/auth.e2e-spec.ts** — routing + DTO validation + ResponseInterceptor
  envelope, with the Broker mocked so no DB is needed.

## ts-jest note

`ts-jest` reads your `tsconfig.json`. If you see "cannot find module" or
decorator-metadata errors, confirm `test/**` isn't in the tsconfig `exclude`
list, and that `experimentalDecorators` + `emitDecoratorMetadata` are enabled
(they are in standard Nest setups).