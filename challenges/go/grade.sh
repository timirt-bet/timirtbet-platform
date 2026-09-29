#!/usr/bin/env sh
# Usage: ./grade.sh <exercise-id> <submission.go>
# Copies the submission next to the exercise's _test.go in a temp dir and runs go test.
# Set GRADE_JSON=1 for machine-readable output.
# Production note: run inside a container with no network, CPU/memory limits and a timeout.
set -e
id="$1"; sub="$2"
dir="$(cd "$(dirname "$0")" && pwd)/$(echo "$id" | tr - _)"
[ -d "$dir" ] || { echo "Unknown Go exercise: $id" >&2; exit 2; }
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
printf 'module submission\n\ngo 1.22\n' > "$tmp/go.mod"
cp "$sub" "$tmp/submission.go"
cp "$dir"/*_test.go "$tmp/"
cd "$tmp"
if [ "${GRADE_JSON:-0}" = "1" ]; then timeout 60s go test -json -race -count=1 -timeout 20s ./...
else timeout 60s go test -v -race -count=1 -timeout 20s ./...; fi
