# Deploy

## Pinned versions
- PocketBase server: **v0.40.6** (local dev binary `./pocketbase`, darwin arm64; use the same version in the `Dockerfile`).
- PocketBase JS SDK: **v0.28.1**, vendored at `pb_public/vendor/pocketbase.es.mjs`.

JS migrations in `pb_migrations/` use the v0.23+ API (`new Collection({fields: [...]})`, `app.save`). Re-check them before bumping the server version.

## Tests
`node --test tests/rules.test.mjs tests/content.test.mjs` (Node 22.7 or newer, which loads the `.js` ES modules without a `package.json`).

## Local dev
```sh
./pocketbase serve --http=127.0.0.1:8090
```
The learner app is at `/`; the admin UI is at `/_/`. Create the superuser and the one `trainers` record in the admin UI. Passwords are never stored in files.
