#!/usr/bin/env bash
# Publishes the generated challenges/ and student-template/ folders to their own repositories
# in your GitHub organization (run after `node authoring/build.mjs` changes them). Uses the gh CLI.
#   bash deploy/sync-repos.sh <org>            # adds a commit to each repository
#   bash deploy/sync-repos.sh <org> --squash   # replaces the challenges history with one commit
#                                              # (removes files, such as old answers, from its history)
set -euo pipefail
org=${1:?usage: bash deploy/sync-repos.sh <org> [--squash]}
squash=${2:-}
root=$(cd "$(dirname "$0")/.." && pwd)
rev=$(git -C "$root" rev-parse --short HEAD 2>/dev/null || echo local)
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT

for r in challenges student-template; do
  gh repo clone "$org/$r" "$tmp/$r" -- -q
  cd "$tmp/$r"
  fresh=no; [ "$squash" = --squash ] && [ "$r" = challenges ] && fresh=yes
  [ $fresh = yes ] && git checkout -q --orphan fresh
  git rm -rq --cached --ignore-unmatch . >/dev/null
  find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
  cp -a "$root/$r/." .
  git add -A
  if [ $fresh = no ] && git diff --cached --quiet; then echo "$org/$r: already up to date"; continue; fi
  git commit -qm "Update from timirtbet-platform $rev"
  if [ $fresh = yes ]; then git branch -M fresh main && git push -q --force origin main
  else git push -q origin HEAD:main; fi
  echo "$org/$r: published"
done
