# FANCYPERU on Dokploy — deployment runbook

Target host: `192.168.1.38` (Ubuntu 26.04, Dokploy + Traefik already running).
Old production host `192.168.1.36` is **read-only** during the migration.

## Topology

```
Internet/LAN
   |
Traefik (existing, ports 80/443, dokploy-network)
   |-- api.<domain>          -> fancyperu-backend:9000   (Medusa API + /app admin)
   |-- shop.<domain>         -> fancyperu-storefront:8000 (Next.js standalone)
   |-- s3.<domain>           -> fancyperu-minio:9000      (public object reads)
   |
fancyperu-internal (dedicated bridge, no host ports)
   |-- fancyperu-db        postgres:16-alpine
   |-- fancyperu-redis     redis:7-alpine (AOF, noeviction)
   |-- fancyperu-minio     MinIO (console bound to 127.0.0.1 inside the container)
   |-- fancyperu-minio-init  one-shot bucket bootstrap
   |-- fancyperu-migration   one-shot `medusa db:migrate`
   |-- fancyperu-backend
   |-- fancyperu-storefront
   `-- fancyperu-worker    optional, separate override file
```

Isolation rules enforced by the file:

- PostgreSQL, Redis and the MinIO console publish **no** host ports.
- Only the backend, storefront and MinIO join `dokploy-network`.
- Each stateful service has its own named volume.
- Dokploy's internal database is not referenced anywhere.

## Resource budget (host has 6.9 GiB)

| Service | Limit | Reservation |
|---|---|---|
| PostgreSQL | 384M | 128M |
| Redis | 192M | 32M |
| MinIO | 384M | 128M |
| Medusa backend | 768M | 320M |
| Storefront | 512M | 160M |
| Migration (one-shot) | 768M | 192M |
| Worker (optional) | 512M | 192M |
| **Steady total** | **~2.2 GiB** | |

Leaves headroom for Dokploy, Traefik, the OS and the old host's data copy.

## Required environment

Copy `config/dokploy.env.example` into the Dokploy Compose environment and fill
every value. Domains are bare hosts (`api.example.com`), CORS values are full
origins (`https://shop.example.com`).

`NEXT_PUBLIC_*` values are inlined at **build** time. Changing them requires a
storefront rebuild, not just a restart.

## Pre-flight checklist (blocking)

1. **Docker Compose plugin.** Dokploy runs `docker compose` **inside its own
   container**, not on the host. Its image installs Docker through
   `get.docker.com`, which includes `docker-compose-plugin`. The host's missing
   plugin therefore does not block Dokploy deployments. Confirm it read-only
   before deploying (no install):

   ```bash
   sudo sh deploy/dokploy/check-dokploy.sh
   ```

   The script prints the Dokploy container/image, the Compose plugin version
   inside the container, the Dokploy package version and the image labels. If it
   shows no Compose plugin, stop: do not install packages without approval. Do
   **not** switch to Docker Stack; stack mode has no `build` support, ignores
   `profiles`, and does not wait for `depends_on` conditions or healthchecks.
2. **Traefik ACME email is the placeholder `test@localhost.com`.** Let's Encrypt
   will not issue certificates for real domains until it is changed in the
   Dokploy/Traefik configuration. This blocks production publication, not the
   private test deployment.
3. **DNS** for `api`, `shop` and `s3` must point to `192.168.1.38` (or to the
   public ingress) before certificates can be issued.
4. `dokploy-network` must exist (verified in the Traefik configuration).
5. Dokploy UI access to create the Compose service and set its environment
   (an API token is optional).
6. `sudo` on the host for Docker inspection and deployment; `ivan` is not in the
   `docker` group and has no passwordless sudo.
7. **Source delivery.** Path B is chosen for the private test: the source tree
   is at `/home/ivan/fancyperu-src`, images are built sequentially with
   `build-from-env.sh`, and Dokploy uses the Raw images compose. No Git push is
   involved.

## Source delivery

For the private test, Path B is chosen; Path A is the production target. The
three paths below remain documented for later.

Dokploy's Compose mode clones a Git repository and runs `docker compose up
--build` inside its own container. The migration changes are **not committed**,
and the working tree contains changes (for example `next.config.js` with
`output: "standalone"` and the S3/Redis configuration in `medusa-config.ts`)
that the build needs. Deploying `main` as-is would not build the current app.

### Path A — Dokploy Git mode (recommended for production)

1. Create a branch (for example `deploy/dokploy-test`) and commit the deployment
   work: `apps/backend`, `apps/storefront`, `config/`, `deploy/dokploy/`,
   `docker-compose.dokploy.yml`, `apps/backend/Dockerfile`,
   `apps/storefront/Dockerfile`, `.dockerignore`, `.npmrc`, `eslint.config.ts`,
   the root workspace files and `pnpm-lock.yaml`. Do not commit `.env` files,
   `node_modules`, `.medusa`, `.next`, `uploads`, `scratch/` or `docs/`.
2. Push the branch to the existing **private** `origin`
   (`FANCYPETSPERU`). This is a remote write and requires explicit
   authorization.
3. In Dokploy, connect the repository (GitHub App or token), create a Docker
   Compose service on that branch with compose path
   `docker-compose.dokploy.yml`, paste the environment and deploy. Dokploy
   builds both images; there is no manual image step.

This is the only path that uses Dokploy's `build` support end to end.

### Path B — prebuild on the host, deploy a Raw compose

Use this if the branch must not be pushed.

1. Transfer the working tree to the host (exclude `.git`, `node_modules`,
   `.medusa`, `.next`, `dist`, `scratch`, `docs`, `odd` and every `.env*`).
2. Create `/home/ivan/fancyperu-dokploy.env` (chmod 600) from
   `config/dokploy.env.example` and build with
   `sudo sh /home/ivan/fancyperu-src/deploy/dokploy/build-from-env.sh`. The wrapper
   sources the private env and calls `build-images.sh` sequentially. The direct
   `build-images.sh` form remains available for advanced use.
3. Create a Dokploy Compose service with source type **Raw** and paste
   `deploy/dokploy/docker-compose.images.yml` (generated by
   `node deploy/dokploy/render-images-compose.mjs`; it has no `build:` blocks).
4. Deploy. Compose uses the local `fancyperu-backend:dokploy` and
   `fancyperu-storefront:dokploy` images. Rebuild the storefront after the
   seed with `sudo sh /home/ivan/fancyperu-src/deploy/dokploy/build-from-env.sh
   storefront` and redeploy.

Caveat: older Dokploy versions have a Raw-mode bug where the environment file
is written to the parent directory and Compose does not load it
([issue #2777](https://github.com/Dokploy/dokploy/issues/2777), fixed in
PR #2900). Verify the Dokploy version or use Path A. A fresh Raw app is less
affected than one converted from Git, but verify that `${VAR:?}` guards resolve
before trusting the deployment.

### Path C — manual host Compose (no Dokploy, no push)

1. Transfer the working tree as in Path B.
2. Install `docker-compose-plugin` only with explicit approval (two packages:
   `docker-compose-plugin` and `docker-buildx-plugin`; Docker Engine is not
   upgraded).
3. Run `sudo docker compose -f docker-compose.dokploy.yml up -d --build`.

This bypasses Dokploy but exercises the same compose file and images. It is the
most predictable fallback for the private test.

## Deploy

1. Dokploy → Project → **Docker Compose** → repository `FANCYPETSPERU`, branch
   and compose path `docker-compose.dokploy.yml`.
2. Paste the environment variables from `config/dokploy.env.example`.
3. Deploy. Startup order is enforced by `depends_on`:
   `db` healthy → `minio` healthy → `minio-init` completed → `migration`
   completed → `backend` healthy → `storefront` healthy.
4. Verify from the host:

```bash
sudo docker ps --filter label=com.docker.compose.project=<app-name>
curl -fsS https://api.<domain>/health
curl -fsSI https://shop.<domain>/
curl -fsSI https://s3.<domain>/fancyperu-media/
```

## MinIO bootstrap contract

`fancyperu-minio-init` runs once per deployment and is idempotent:

- `fancyperu-media` is created if missing and set to **anonymous read only**.
- `fancyperu-private` is created if missing and its anonymous policy is set to
  **none**.
- It never deletes a bucket or an object.
- Credentials are passed only through environment variables and are never
  echoed; `mc` output is suppressed.

It runs before the migration and therefore before the backend starts.

## Worker decision

Medusa 2.21.2 defaults to `workerMode: "shared"`: one process serves HTTP and
runs subscribers/workflows. That is sufficient for this store and saves RAM.

`medusa-config.ts` reads `MEDUSA_WORKER_MODE` (default `shared`). A dedicated
worker is **not** part of the deployed file: Dokploy's Docker Compose mode runs
`docker compose up` without `--profile`, so a profiled service would never
start (and `--remove-orphans` would remove it on the next deploy).

For a deliberate split, use the override file from the repository root:

```bash
docker compose -f docker-compose.dokploy.yml \
               -f deploy/dokploy/docker-compose.worker.yml up -d
```

It switches the backend to `server` mode and adds one `worker` process. Do not
run a `shared` backend and a worker at the same time: jobs would run twice.
Dokploy cannot use this override without a custom deployment command.

## Dokploy Compose mode (verified against the Dokploy docs)

Dokploy's default command for a Compose service is equivalent to:

```bash
docker compose -p <app-name> -f <compose-path> up -d --build \
  --remove-orphans --force-recreate
```

Consequences for this stack:

- `build:` is supported (unlike Stack mode).
- `depends_on` with `condition: service_healthy` /
  `service_completed_successfully` and healthchecks are honored by Compose.
- `profiles` are **not** passed, so the main file has no profiled services.
- `--force-recreate` recreates **every** container on each deploy, including
  PostgreSQL, Redis and MinIO. That is acceptable for the test phase; for
  production, override the Dokploy command to drop `--force-recreate` so only
  changed services restart.
- `-p <app-name>` overrides the top-level `name:`. Volumes keep their explicit
  `name:` and survive; the backup script takes `PROJECT=<app-name>` to find the
  containers.
- In **Git mode**, Dokploy writes the environment file next to the compose file
  (the compose directory), so `${VAR}` substitution and the `:?` guards work as
  written. In **Raw mode**, older Dokploy versions write it to the parent
  directory and Compose does not load it (issue #2777, fixed in PR #2900);
  verify the version before relying on Raw mode. Values reach containers only
  through the explicit `environment:` blocks.

## Private test deployment (Phase C)

The private LAN test uses **functional nip.io domains with plain HTTP**: the
wildcard DNS service already maps any `*.192.168.1.38.nip.io` to the host IP,
so no DNS or certificate change is involved. Set in the Dokploy environment:

```text
TRAEFIK_ENABLE=true
PUBLIC_SCHEME=http
TRAEFIK_ENTRYPOINT=web
TRAEFIK_TLS=false
TRAEFIK_CERTRESOLVER=
COOKIE_SECURE=false
NEXT_PUBLIC_ENVIRONMENT=staging
API_DOMAIN=api.192.168.1.38.nip.io
STOREFRONT_DOMAIN=shop.192.168.1.38.nip.io
S3_DOMAIN=s3.192.168.1.38.nip.io
```

`TRAEFIK_CERTRESOLVER=` must be **empty**: a router that declares a resolver is
treated as TLS and refuses to serve plain HTTP. Nothing is published outside
the LAN and no Let's Encrypt request is made; production uses the documented
defaults (`https`/`websecure`/TLS/`letsencrypt`) and does not set these keys.
If the host's Traefik `web` entrypoint redirects HTTP to HTTPS (check
`sudo sh deploy/dokploy/preflight-stack.sh` output), switch the test to
`PUBLIC_SCHEME=https`, `TRAEFIK_ENTRYPOINT=websecure`, `TRAEFIK_TLS=false`
(before the storefront rebuild) and accept the self-signed-certificate
warning in the browser.

Before the first run one pre-existing rule resolved only `.invalid`
placeholders (for example `api.fancyperu.invalid`); that variant is still
supported with `TRAEFIK_ENABLE=false` — the `:?` guards on
`API_DOMAIN`/`STOREFRONT_DOMAIN`/`S3_DOMAIN` stay satisfiable either way.

Generate every secret with `openssl rand -hex 32` (hex avoids URL-encoding and
`.env` quoting problems). `ORDER_TOKEN_SECRET` is mandatory: the storefront
refuses to sign order tokens in production without it.

Path B/C: create `/home/ivan/fancyperu-dokploy.env` (chmod 600) from
`config/dokploy.env.example` and run
`sudo sh /home/ivan/fancyperu-src/deploy/dokploy/build-from-env.sh` for both images
**before** the first deploy (it builds sequentially; see
[Build memory](#build-memory-and-build-time)). Path A builds inside Dokploy.
After the seed, Path B must rebuild the storefront with
`sudo sh /home/ivan/fancyperu-src/deploy/dokploy/build-from-env.sh storefront` and
the real publishable key in the env file; a Raw redeploy alone does not rebuild
the image.

The first deploy uses `pk_bootstrap`; storefront pages that call the Medusa API
will fail until the seed creates the real key and the storefront is rebuilt.
The storefront container healthcheck probes the static `/robots.txt`, so the
bootstrap container is healthy; the verification script still probes `/` and
will report the expected bootstrap error.

Order:

1. Deploy with the nip.io LAN-HTTP environment (or `TRAEFIK_ENABLE=false`),
   `CULQI_ENABLED=false`, empty Culqi keys
   and a placeholder `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` (for example
   `pk_bootstrap`). The backend, database, Redis, MinIO and migration become
   healthy; the storefront starts and its static `/robots.txt` healthcheck
   passes, but it cannot query the API yet, so the home page errors. That is
   expected; do not delete the stack.
2. Run the idempotent staging seed inside the backend container:

   ```bash
   sudo docker exec --env-file /home/ivan/fancyperu-seed.env <backend-container> \
     sh -c 'cd /app/apps/backend/.medusa/server && \
       node ../../node_modules/@medusajs/cli/cli.js exec ./src/scripts/staging-seed.js'
   ```

   The compiled seed lives in the runtime image at
   `.medusa/server/src/scripts/staging-seed.js` (the container workdir). It
   creates the Peru region with **`pp_system_default` only** — Culqi is never
   attached to a region — plus a demo catalog and a publishable key.
3. Read the generated publishable key token from the test database (do not print
   other rows):

   ```bash
   sudo docker exec <db-container> psql -U <user> -d <db> -tAc \
     "select token from api_key where title = 'FancyPets Staging Publishable Key'"
   ```
4. Put that token in `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` and redeploy so the
   storefront is rebuilt with the real key.
5. Run `sudo sh deploy/dokploy/verify-test-deploy.sh` with
   `PROJECT=<dokploy-app-name>`. It is read-only and checks versions, health,
   restarts, volumes, network, one-shot exit codes, bucket policies, HTTP
   endpoints, admin `emailpass` login, absence of published ports, Culqi state
   and the absence of `CULQI_SECRET_KEY` from the storefront bundle.

## Build memory and build time

The host has 6.9 GiB. Runtime is ~2.2 GiB; a Medusa/Vite build can peak around
2–3 GiB and the Next.js build around 1–2 GiB. Two parallel builds during a
redeploy of a running stack can exhaust RAM.

- Set Dokploy **Concurrent Builds = 1**. This limits builds across Dokploy
  applications, **not** the services inside one Compose app.
- `docker compose up --build` uses BuildKit Bake and may build the backend and
  storefront **in parallel** even with Concurrent Builds = 1. On a 7 GiB host
  that can put 4–5 GiB of build memory next to Dokploy/Traefik and approach the
  limit. `deploy/dokploy/build-images.sh` builds them sequentially on purpose;
  prefer it for the private test (Path B/C). If Dokploy Git mode is used,
  prebuild with the script or stop the stack before the first build.
- `deploy/dokploy/build-from-env.sh` sources the private env and calls
  `build-images.sh` one image at a time; use it for Path B/C.
- Measured locally on the workstation: `medusa build` took 81 s for the backend
  and 241 s for the admin bundle (~5.4 min total); the storefront compiled in
  45 s and completed with standalone output (~2–3 min with cache). A fresh
  Docker build adds `pnpm install` and image layers. Forecast on the 4 vCPU
  host: **8–15 min for the backend image**, **4–8 min for the storefront**, and
  **12–20 min for the first full deploy**.
- For the first deploy nothing else runs, so one build at a time is safe.
- For later redeploys, stop the FANCYPERU stack before rebuilding (test-phase
  downtime is acceptable) or build when the host is idle.
- The 4 GiB swap is a safety net, not a substitute for serial builds.

## Privileged commands and reversibility (Phase C)

Read-only checks (no application state changed):

```bash
sudo docker ps -a --format '{{.Names}}\t{{.Status}}\t{{.Image}}'
sudo docker logs --tail 100 <container>
sudo docker exec <container> <read-only command>
sudo PROJECT=<app-name> sh deploy/dokploy/verify-test-deploy.sh
```

Mutating operations that need explicit approval:

- `git push origin deploy/dokploy-test` — remote write to the private origin
  (Path A).
- Dokploy **Deploy/ Redeploy** — creates the stack, builds images, writes
  volumes.
- `sudo sh deploy/dokploy/build-images.sh` — builds and tags images on the host
  (Path B/C).
- The staging seed — inserts test catalog, region, admin and API key into the
  **test** database.
- `sudo apt-get install docker-compose-plugin` — Path C only; two packages,
  no Docker Engine upgrade.

Never without separate approval: any operation on `192.168.1.36`, Docker Engine
upgrades, adding `ivan` to the `docker` group or NOPASSWD, DNS/ACME/Traefik
changes, and real Culqi keys.

Reversibility: deleting the Dokploy app removes its containers; the named
volumes (`fancyperu_db_data`, `fancyperu_redis_data`,
`fancyperu_minio_data`, `fancyperu_uploads`) survive unless deleted explicitly.
`docker compose down -v` destroys the test data. The source copy and built
images can be removed at any time. The old host is never modified.


## Staging admin password rotation and RBAC

The staging admin is created by the seed with `metadata.role` only. That is not
authorization. With `MEDUSA_FF_RBAC=true` the JWT carries
`app_metadata.roles: []`, so every policy-protected admin route returns 403
before its handler runs. `POST /admin/users/:id/reset-password` requires
`user:update`, which is why the HTTP reset flow fails at the token step.

The order below is mandatory and enforced by a marker file:

1. Rotate the exposed password with the auth module service. This path does not
   need RBAC. On success it writes `/home/ivan/fancyperu-rotation-verified`
   (mode 600, owner `ivan`) only after verifying new password `200` and old
   password `401`:

   ```bash
   sudo sh /home/ivan/fancyperu-src/deploy/dokploy/rotate-via-exec.sh
   ```

2. Verify the new seed password and inspect the marker (no secrets are shown):

   ```bash
   sh /home/ivan/fancyperu-src/deploy/dokploy/check-admin.sh
   grep -E '^(ROTATION_STATUS|ROTATION_VERIFIED_AT|PROJECT|NEW_PASSWORD_LOGIN|OLD_PASSWORD_LOGIN)=' \
     /home/ivan/fancyperu-rotation-verified
   ```

3. Assign `role_super_admin` to the existing staging admin. The script refuses
   to run if the marker is missing/stale, the recovery file exists, or the
   current seed password does not authenticate. It then verifies a fresh JWT,
   `/admin/users`, `/admin/products` and `/app`:

   ```bash
   sudo sh /home/ivan/fancyperu-src/deploy/dokploy/assign-staging-admin-role.sh
   ```

   Read-only status and safe rollback:

   ```bash
   sudo sh /home/ivan/fancyperu-src/deploy/dokploy/assign-staging-admin-role.sh --status
   sudo sh /home/ivan/fancyperu-src/deploy/dokploy/assign-staging-admin-role.sh --rollback
   ```

The role scripts target exactly project `fancyperu-test-k6cmve` and user
`staging-admin@fancyperu.test`. They never create users or roles, never change a
password, never run the seed, never use SQL and never print credentials. The
rollback removes only the `role_super_admin` link; the user and password remain.

## Backups

`deploy/dokploy/backup.sh` produces a timestamped directory with:

- `db.dump` — `pg_dump -Fc` of the FANCYPERU database,
- `minio/media/` and `minio/private/` — object copies via `mc mirror`,
- `SHA256SUMS`.

It performs no deletion by default. Dokploy overrides the Compose project name
with its app name, so pass it explicitly. Run from the host as a user with
Docker access:

```bash
sudo PROJECT=<dokploy-app-name> sh deploy/dokploy/backup.sh \
  /var/backups/fancyperu /etc/dokploy/compose/<app-name>/.env
```

The env file is the one Dokploy writes for the service (location shown in the
Dokploy UI); it is read locally and its values are never echoed.

Restore: recreate the stack, stop backend/storefront, `pg_restore` into a fresh
database, `mc mirror` back into the buckets, then start the backend. Bucket
policies are recreated by `fancyperu-minio-init`.

## Rollback

The old host is untouched. Rollback is DNS-only: point the records back to
`192.168.1.36`. Do not stop or modify the old stack until the new one has been
validated with real data.

## Security notes

- No database, Redis or MinIO console port is published.
- MinIO media is public-read by design (product images); private bucket has no
  anonymous policy.
- The backend runs as the non-root `medusa` user; the storefront as `nextjs`.
- The storefront receives `ORDER_TOKEN_SECRET` (shared HMAC secret) but not
  `JWT_SECRET` or `COOKIE_SECRET`; it never receives `CULQI_SECRET_KEY`.
- `COOKIE_SECURE=true` is required behind HTTPS.
- Never commit the filled environment file.
