# Word Garden

A simple, gamified web platform that helps complete beginners learn the basics of Microsoft Word, and keep what they learn.

Learners practise on a lifelike mock of Windows Word, right in the browser. Each mission is a small real-life job, such as writing a short "About me" note, tidying a shopping list or adding a picture to a flyer. Every skill they practise grows as a plant in their garden. Skills they leave alone for a while start to wilt, and a weekly revision round brings them back to full health. The idea is gentle, regular practice rather than cramming.

It was built for adult learners aged roughly 40 to 70 who are new to computers and are learning in English as a second language. Every screen therefore has big buttons, plain wording, step-by-step hints that get more specific if you're stuck, and an optional Vietnamese translation you can switch on or off.

## What's in it

- **Learner app** (`/`): join with a name and a picture (no password; returning learners tap "Continue as…"), pick a mission and work in the mock Word window. Hints build up in three steps: a written nudge, then the right part of the ribbon lit up, then a "Show me" demo. Learners earn stars, grow plants and take a mixed revision round.
- **Trainer portal** (`/trainer.html`): log in, start a class session (tick the topics you've taught, then choose the mode and length) and watch each learner's progress on a dashboard.
- **Class garden** (`/projector.html`): a read-only, full-screen view for the classroom projector, where everyone's plants grow together.
- **Mock Word engine** (`pb_public/js/word/`): a small copy of Word with a ribbon, document model, selection, undo, dialogs and picture handling. Missions are plain data checked against the document, so adding one doesn't need new engine code.

Topics (1–6 are playable now; 7–9 are still being written):

1. Getting started
2. Typing and editing
3. Formatting
4. Lists and simple documents
5. Tables and page layout
6. Pictures
7. Templates and saving safely
8. A real-life document
9. Review

## How it's built

- **Backend:** [PocketBase](https://pocketbase.io) (a single binary with a built-in database, admin UI and live updates). Collections come from the JS migrations in `pb_migrations/`.
- **Front end:** plain JavaScript ES modules, with no framework and no build step. The app is the static files in `pb_public/`, and the PocketBase JS SDK is vendored in `pb_public/vendor/`.
- **Learners have no passwords.** The browser remembers who they are so they can carry on from where they left off. Only the trainer logs in.
- Skill progress is worked out from each learner's recorded attempts, so there is one place where data is written.

```
pb_public/      the app (learner, trainer and projector pages, Word mock, mission content)
pb_migrations/  database setup, applied automatically on start
pb_hooks/       small server hooks (cache headers)
tests/          content and game-rules checks
scripts/        release.sh (laptop) and update-server.sh (server)
deploy/         full deployment guide
Dockerfile, docker-compose.yml
```

The screenshots and course documents the missions were modelled on are not part of this repo.

## Run it locally

You need [Node.js](https://nodejs.org) 22.7+ only for the tests. To run the app, download the PocketBase **v0.40.6** binary for your system from the [PocketBase releases](https://github.com/pocketbase/pocketbase/releases) and put it in the project root, then:

```sh
./pocketbase serve --http=127.0.0.1:8090
```

Open `http://127.0.0.1:8090`. Create the PocketBase superuser at `/_/`, then add one record in the `trainers` collection for the trainer login. Passwords stay in the database, never in files.

```sh
node --test tests/    # run the checks
```

## Deploy to a server

The app runs as one Docker Compose service. It listens on `127.0.0.1:8090` only, so put your own HTTPS reverse proxy (nginx, Caddy and so on) in front of it. You need Docker with the Compose plugin and git on the server.

```sh
git clone https://github.com/<your-user>/<repo>.git word-garden
cd word-garden
docker compose up -d --build
docker compose logs --tail 100 word-garden
```

1. Open `http://localhost:8090/_/` on the server (for example through an SSH tunnel) and follow the superuser setup link shown in the logs. Create the one `trainers` record there.
2. Point the reverse proxy at `http://127.0.0.1:8090` with HTTPS. Live updates use server-sent events, so turn proxy buffering off. In nginx that is `proxy_buffering off;` and `proxy_read_timeout 1h;`.
3. Check that a learner can join and answer an item, the projector updates live, and the data survives `docker compose restart word-garden`.

Data lives in `./pb_data` on the server. It is never committed, and you shouldn't copy a development `pb_data` over a live one.

### Releasing and updating

The version number is shown as a small `vX.Y.Z` label at the bottom of the learner, trainer and projector pages. It comes from `pb_public/js/version.js`.

On your laptop, with your work committed:

```sh
scripts/release.sh            # 0.1.0 -> 0.1.1 (or: minor, major, or an exact version like 1.4.2)
```

This runs the tests, bumps the version, commits, tags and pushes to GitHub. Then on the server:

```sh
scripts/update-server.sh
```

This pulls the new version, rebuilds, backs up `pb_data` (keeping the last 14 backups), restarts and checks that the site is serving the new version. If the build fails, the running site is left untouched.

The full guide is in [`deploy/README.md`](deploy/README.md). It covers the GitHub remote, a deploy key for a private repo, backups and rollback.
