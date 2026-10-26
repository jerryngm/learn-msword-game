#!/usr/bin/env bash
# Run on your laptop: bump the version, run the tests, commit, tag and push to GitHub.
#   scripts/release.sh            bump patch (0.1.0 -> 0.1.1)
#   scripts/release.sh minor      0.1.1 -> 0.2.0
#   scripts/release.sh major      0.2.0 -> 1.0.0
#   scripts/release.sh 1.4.2      set an exact version
# Commit your work first; the script refuses to run on a dirty tree.
set -euo pipefail

cd "$(dirname "$0")/.."
VERSION_FILE="pb_public/js/version.js"
BUMP="${1:-patch}"

branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" != "main" ]; then
  echo "Release from main (you are on '$branch')." >&2
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  cat >&2 <<'MSG'
No GitHub remote yet. Create an empty private repo on github.com, then run:
  git remote add origin git@github.com:<your-user>/<repo>.git
and run this script again.
MSG
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Uncommitted changes. Commit them first (git add <files> && git commit), then re-run." >&2
  git status --short >&2
  exit 1
fi

current="$(sed -n 's/.*APP_VERSION = "\([0-9]*\.[0-9]*\.[0-9]*\)".*/\1/p' "$VERSION_FILE")"
if [ -z "$current" ]; then
  echo "Could not read APP_VERSION from $VERSION_FILE" >&2
  exit 1
fi
IFS=. read -r major minor patch <<<"$current"

case "$BUMP" in
  patch) next="$major.$minor.$((patch + 1))" ;;
  minor) next="$major.$((minor + 1)).0" ;;
  major) next="$((major + 1)).0.0" ;;
  [0-9]*.[0-9]*.[0-9]*) next="$BUMP" ;;
  *) echo "Usage: $0 [patch|minor|major|X.Y.Z]" >&2; exit 1 ;;
esac

if git rev-parse -q --verify "refs/tags/v$next" >/dev/null; then
  echo "Tag v$next already exists." >&2
  exit 1
fi

echo "Running tests..."
node --test tests/

cat >"$VERSION_FILE" <<EOF
// The one place the app version lives. scripts/release.sh rewrites this file; do not edit by hand.
export const APP_VERSION = "$next";
EOF

git add "$VERSION_FILE"
git commit -m "chore(release): v$next"
git tag -a "v$next" -m "v$next"
git push -u origin main
git push origin "v$next"

echo
echo "Released v$next (was v$current). On the VPS run: scripts/update-server.sh"
