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
location. Optionally restrict `/_/` to the trainer's IP. The app sends
`Cache-Control: no-cache` on its own files (`pb_hooks/static-cache.pb.js`) so
browsers pick up an update at once; do not add proxy caching or `expires` rules
that override it.

Verify that a learner can join and answer an item, the projector updates live,
and `docker compose restart word-garden` preserves the learner and progress.
Repeat the live-update check from a classroom laptop through the domain.

## Versions, GitHub and updating the server

The app version is `APP_VERSION` in `pb_public/js/version.js`, shown as a small
`vX.Y.Z` label at the bottom centre of the learner, trainer and projector pages
(hidden over the Word mock). Only `scripts/release.sh` changes it.

### One-time: create the GitHub remote (laptop)
1. On github.com choose **New repository**. Private or public both work: the
   repo holds only the platform (no screenshots, course documents or planning
   notes, which `.gitignore` keeps out). Leave README, .gitignore and
   licence unticked so the repo is empty.
2. In the repository root:
   ```sh
   git remote add origin git@github.com:<your-user>/<repo>.git
   git remote -v
   ```
   Use the HTTPS URL instead if you have not set up an SSH key with GitHub.
3. Commit your current work (`git status` must be clean), then run `scripts/release.sh`.
   The first run pushes `main` and sets it as the upstream.

### One-time: prepare the VPS
1. Install Docker (with the compose plugin) and git.
2. If the repo is **private**, give the VPS read-only access with a deploy key
   (a public repo clones over HTTPS with no key, so skip this step):
   ```sh
   ssh-keygen -t ed25519 -f ~/.ssh/word-garden-deploy -N "" -C "word-garden-vps"
   cat ~/.ssh/word-garden-deploy.pub
   ```
   Paste the public key at GitHub, repo **Settings → Deploy keys → Add deploy key**
   (leave "Allow write access" off). Then add to `~/.ssh/config`:
   ```
   Host github-word-garden
     HostName github.com
     User git
     IdentityFile ~/.ssh/word-garden-deploy
     IdentitiesOnly yes
   ```
3. Clone and start:
   ```sh
   git clone git@github-word-garden:<your-user>/<repo>.git word-garden
   cd word-garden
   docker compose up -d --build
   ```
   Then follow "Docker deployment" above for the reverse proxy and accounts.
   `pb_data/` is created on the VPS and is never in git.

### Every release
On the laptop (commit your work first):
```sh
scripts/release.sh          # patch: 0.1.0 -> 0.1.1
scripts/release.sh minor    # 0.1.1 -> 0.2.0
scripts/release.sh major    # 0.2.0 -> 1.0.0
scripts/release.sh 1.4.2    # exact version
```
It refuses to run unless you are on `main` with a clean tree, runs `node --test tests/`,
writes the new version, commits `chore(release): vX.Y.Z`, tags `vX.Y.Z` and pushes both.

On the VPS, from the checkout:
```sh
scripts/update-server.sh
```
It fetches and fast-forwards, builds the new image while the old one still runs,
stops the service only to back up `pb_data/` (to `../word-garden-backups`, newest 14 kept),
starts it, then waits for `/api/health` and confirms the served version matches the
pulled one. If the build fails, nothing was stopped and it prints the exact rollback command.
It refuses to run if the VPS checkout has local changes: never edit files on the server.

Never copy a development `pb_data/` to the VPS, and never commit it.

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
