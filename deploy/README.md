# Deploy

## Pinned versions
- PocketBase server: **v0.40.6** (local dev binary `./pocketbase`, darwin arm64; use the same version in the `Dockerfile`).
- PocketBase JS SDK: **v0.28.1**, vendored at `pb_public/vendor/pocketbase.es.mjs`.

JS migrations in `pb_migrations/` use the v0.23+ API (`new Collection({fields: [...]})`, `app.save`). Re-check them before bumping the server version.

## Tests
`node --test tests/` (Node 22.7 or newer, which loads the `.js` ES modules without a `package.json`).

## Local dev
```sh
./pocketbase serve --http=127.0.0.1:8090
```
Pages:
- `/`: learner app
- `/trainer.html`: trainer portal (log in with the `trainers` account, not the superuser); session setup is `/trainer.html#/setup`
- `/projector.html`: class garden for the projector (no login, read-only, made for 1920×1080)
- `/_/`: PocketBase admin UI

Create the superuser and the one `trainers` record in the admin UI. Passwords are never stored in files.

## Docker deployment

The root `Dockerfile` pins PocketBase 0.40.6 and supports Linux amd64 and arm64.
The Compose service binds only to `127.0.0.1:8090`; put your HTTPS reverse proxy
in front of it. Data persists in the host's `pb_data/` directory.

Before starting, check whether the local development server already owns port
8090. Stop it only if you own it. Back up existing data before an update because
PocketBase applies pending migrations automatically at startup.

```sh
docker compose config --quiet
docker compose up -d --build
docker compose logs --tail 100 word-garden
```

On a fresh server, open `http://localhost:8090/_/` through a trusted local
connection and follow PocketBase's superuser setup link from the logs. Create
the trainer record in the `trainers` collection. Keep credentials out of files
and source control. The learner, trainer and projector use the same origin;
no domain needs to be compiled into the app.

Point the reverse proxy at `http://127.0.0.1:8090`. Enable HTTPS, pass streaming
responses through, and disable buffering for PocketBase realtime (SSE). For
nginx, include `proxy_buffering off;` and `proxy_read_timeout 1h;` in the proxied
location. Optionally restrict `/_/` to the trainer's IP.

Verify that a learner can join and answer an item, the projector updates live,
and `docker compose restart word-garden` preserves the learner and progress.
Repeat the live-update check from a classroom laptop through the domain.

## Backups, updates and rollback

Use PocketBase's admin backup scheduler nightly and keep 14 days. For a manual
filesystem backup, stop the service first so the SQLite files are consistent.
Run these commands from the repository root; backups live beside the checkout.

```sh
docker compose stop word-garden
mkdir -p ../word-garden-backups
tar -czf "../word-garden-backups/pb-data-$(date +%Y%m%d-%H%M%S).tgz" pb_data
docker compose start word-garden
```

If the backup command fails, resolve that before updating. Pull or copy the new
application source, then run `docker compose up -d --build`. Do not copy a
development `pb_data/` over the server's data. Inspect startup logs and repeat
the learner and realtime checks.

For rollback, stop the service, preserve the failed `pb_data/` separately, restore
the matching backup into the repository root, restore the matching application
revision, and rebuild. A backup restore replaces progress recorded after that
backup, so choose it deliberately. Do not run old application code against a
newer schema without confirming compatibility.
