#!/usr/bin/env bash
# Uploads the extra (hidden) checks to Secret Manager and mounts them into the grader.
# Run from Cloud Shell after cloning the private answers into ./solutions:
#   node authoring/build.mjs            # checks them and writes solutions/hidden-tests.json
#   bash deploy/upload-hidden-tests.sh
# Only the grader's service account can read the secret. Later deploys keep the mount,
# so this is needed again only when the extra checks change.
set -euo pipefail
cd "$(dirname "$0")/.."
source deploy/config.env
: "${PROJECT_ID:?}" "${REGION:?}"
FILE="${1:-solutions/hidden-tests.json}"
[ -s "$FILE" ] || { echo "No $FILE. Run: node authoring/build.mjs (with the answers in ./solutions)"; exit 1; }
node -e 'const o = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); console.log("Extra checks for " + Object.keys(o).length + " exercises")' "$FILE"
gcloud config set project "$PROJECT_ID" >/dev/null
GRADER_SA="timirtbet-grader@$PROJECT_ID.iam.gserviceaccount.com"

if ! gcloud secrets describe hidden-tests >/dev/null 2>&1; then
  gcloud secrets create hidden-tests --replication-policy=automatic >/dev/null
  gcloud secrets add-iam-policy-binding hidden-tests --member="serviceAccount:$GRADER_SA" --role=roles/secretmanager.secretAccessor >/dev/null
fi
gcloud secrets versions add hidden-tests --data-file="$FILE" >/dev/null
echo "Uploaded a new version of the secret hidden-tests"

# Mounted as a file; the grader reads it on every request, so new versions apply on the next revision.
gcloud run services update timirtbet-grader --region "$REGION" \
  --update-secrets "/secrets/hidden/tests.json=hidden-tests:latest" \
  --update-env-vars "HIDDEN_TESTS_FILE=/secrets/hidden/tests.json" --quiet >/dev/null
echo "The grader now runs the extra checks."
