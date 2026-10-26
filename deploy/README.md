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
