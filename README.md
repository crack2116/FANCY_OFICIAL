# Fancy Pets

E-commerce storefront and admin for Fancy Pets, a pet store in Peru. The customer-facing shop runs on Next.js and talks to a Medusa backend; the manager runs everything else from the Medusa admin dashboard, including how the shop looks.

This repository is a Medusa DTC starter that has been reshaped into the Fancy Pets product. The upstream starter is still reachable as the `upstream` remote.

## Stack

| | |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Backend | Medusa v2 (2.21.2), Node 22+, PostgreSQL 15+ |
| Storefront | Next.js 15 (App Router, Turbopack) |
| Package manager | pnpm 10.11.1 |

## Requirements

- **Node.js >= 22.22.0**
- **pnpm 10.11.1** — use the version in the root `package.json`, never introduce a second lockfile
- **PostgreSQL 15+** running and reachable at the `DATABASE_URL` you configure

> On a WSL development machine, note that PostgreSQL runs *inside* WSL and Windows reaches it through the WSL2 localhost relay on `127.0.0.1:5432`. That relay is unreliable right after WSL boots: a Windows-side check for a PostgreSQL service always finds nothing, which looks like a missing database when it is really a cold relay. If the backend dies with `ECONNREFUSED 127.0.0.1:5432`, start WSL and confirm the port answers several times in a row before touching anything else.

## Setup

```bash
pnpm install

cp apps/backend/.env.template    apps/backend/.env
cp apps/storefront/.env.template apps/storefront/.env.local
```

Then fill in at least:

| Variable | Where | Notes |
|---|---|---|
| `DATABASE_URL` | backend | Your PostgreSQL connection string |
| `JWT_SECRET`, `COOKIE_SECRET` | backend | Any non-trivial random strings |
| `MEDUSA_BACKEND_URL` | backend | **See the warning below** |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | storefront | Without it every store request returns 400 |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | storefront | `http://localhost:9000` for local work |

> **`MEDUSA_BACKEND_URL` is load-bearing.** The file module builds every uploaded asset URL from it, and those URLs are then persisted into `store.metadata.branding`. A wrong value does not fail loudly at upload time — it bakes unreachable links into saved data. Include the `/static` path, not just the origin: `@medusajs/file-local` replaces the pathname of this value with the file key, while the framework mounts uploads at `/static`.

Then create the database schema and an admin user:

```bash
cd apps/backend
pnpm exec medusa db:migrate
pnpm exec medusa user -e admin@fancyperu.com -p supersecret
```

## Running

```bash
pnpm run dev              # both apps
pnpm run backend:dev      # http://localhost:9000, admin at /app
pnpm run storefront:dev   # http://localhost:8000/pe
```

Start the backend only after PostgreSQL is actually reachable, otherwise it exits after a few retries.

## Seeding data

There is no working `pnpm run backend:seed`. The `seed` task exists in `turbo.json` but the backend package defines no `seed` script, so turbo resolves it to `<NONEXISTENT>` and the command does nothing. Run the scripts directly instead:

```bash
cd apps/backend
pnpm exec medusa exec ./src/scripts/bootstrap-vet-domain.ts
pnpm exec medusa exec ./src/scripts/bootstrap-vet-taxonomy.ts
pnpm exec medusa exec ./src/scripts/bootstrap-vet-catalog.ts
pnpm exec medusa exec ./src/scripts/bootstrap-peru.ts
pnpm exec medusa exec ./src/scripts/seed-demo-products.ts
pnpm exec medusa exec ./src/scripts/seed-staff-accounts.ts
```

All of them are idempotent by design: running one twice converges instead of duplicating.

`bootstrap-peru.ts` is the one that matters for a working store — it creates the Peru region, zones, shipping options and PEN prices, and it deliberately leaves the upstream demo Europe region alone.

`seed-staff-accounts.ts` reads its credentials from the environment and never from the repository:

```bash
FANCYPETS_MANAGER_EMAIL=...    FANCYPETS_MANAGER_PASSWORD=...
FANCYPETS_DEVELOPER_EMAIL=...  FANCYPETS_DEVELOPER_PASSWORD=...
```

A password is required only for an account that does not exist yet. An account that already exists is reconciled — its role is updated and its password is never read, so re-running never rotates a live credential.

## What this fork adds over the starter

**A manager-owned look, with no code changes.** `Marca`, in the main navigation, is a single screen that owns the colours, the logo, the announcement strip, the six category images and the two hero banners. Everything persists in `store.metadata.branding` rather than in code, and the storefront prefers the saved values over its shipped fallbacks, degrading per entry so one missing upload never blanks a slot.

Uploads go through Medusa's own file module with image-type and size validation, and the workflow deletes the file when the metadata write fails, so a failed save cannot leave an orphan behind.

**Staff accounts with a role.** Accounts carry `metadata.role`, and the settings sidebar hides the `Desarrollador` group for `manager`. This is **presentation only**: `metadata.role` is not authorization, and with `MEDUSA_FF_RBAC` off the routes behind that group stay reachable by direct URL. Turning RBAC on loads the RBAC module, at which point admin accounts need a real RBAC role and not just `metadata.role`.

**A storefront that matches the reference design.** Header, hero and catalogue work was measured against the live store rather than eyeballed, and the hero carousel autoplays with a play/pause control, pauses on hover and focus, and never autoplays under `prefers-reduced-motion`.

## Project layout

```text
apps/
  backend/     Medusa app: admin customizations, API routes, modules, workflows, scripts
  storefront/  Next.js app: home, catalogue, cart, checkout, account
odd/tasks/     Feature documents written while building the above
```

## Checks

```bash
pnpm run lint
cd apps/backend    && pnpm exec medusa lint
cd apps/storefront && pnpm exec next lint
cd apps/storefront && pnpm exec tsc --noEmit -p tsconfig.json
cd apps/backend    && pnpm exec tsc --noEmit -p tsconfig.json
```

`tsc` in `apps/backend` reports one pre-existing error, `TS1470` at `src/admin/widgets/login-branding-widget.tsx:4`. Treat it as baseline noise, not a regression.

Integration suites need a reachable PostgreSQL.

### A note on the header's hidden focus guards

The SSR HTML for the storefront header contains two `<span hidden>` focus guards emitted by `@headlessui/react`'s `Popover` — one per Popover, in `SideMenu` and in the cart button. They are absent from the DOM after hydration, and that is correct: Headless UI renders them for the initial paint and removes them once mounted. They are **not** the cause of the hydration mismatch described above.

If you ever see a hydration mismatch in development, suspect the dev server before the code: a bundle compiled against one state of the tree while the server renders another reproduces it reliably, and it disappears once the dev server settles.

## Known issues

- **Hydration mismatch on `/pe` — open, unexplained.** React pairs the client's `<header className="w-full bg-surface">` against the server's `<div className="bg-[var(--chrome-header)]>` in `modules/layout/templates/nav/index.tsx`, and regenerates the header on the client. It survives a hard reload. It could not be reproduced in 36 controlled loads (fresh cache-disabled loads, clean browser profiles, a production build, an HMR update to a live page, throttled network, and seven routes), so it depends on something in a real browser that a headless run does not reach. First thing to check is a browser extension mutating the DOM before React hydrates; the second is to replicate the exact browser and window size. Do not "fix" it by changing `@headlessui/react` versions — the hidden focus guards in the header are that library's intended SSR lifecycle, not this bug.
- **`next/image` quality warnings.** Product thumbnails pass `quality={50}`, which Next.js 16 will require to be declared in `images.qualities`.