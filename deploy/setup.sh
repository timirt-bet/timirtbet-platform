#!/usr/bin/env bash
# One-time Google Cloud setup for Timirtbet. Safe to run again: every step skips what already exists.
#
#   cp deploy/config.env.example deploy/config.env   # fill it in
#   gcloud auth login && gcloud auth application-default login
#   bash deploy/setup.sh
#
# Creates: APIs, Firestore, Artifact Registry, service accounts and their permissions, secrets,
# Pub/Sub topics, Workload Identity Federation for GitHub Actions, and a budget alert.
# The GitHub Actions workflow then builds and deploys on every push to main.
set -euo pipefail
cd "$(dirname "$0")/.."
source deploy/config.env

: "${PROJECT_ID:?}" "${REGION:?}" "${BILLING_ACCOUNT:?}" "${PLATFORM_REPO:?}" "${GITHUB_ORG:?}"
gcloud config set project "$PROJECT_ID" >/dev/null
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
sa() { echo "$1@$PROJECT_ID.iam.gserviceaccount.com"; }
exists() { "$@" >/dev/null 2>&1; }
step() { printf '\n\033[1m== %s\033[0m\n' "$1"; }

step "Link billing and enable APIs"
[ "$(gcloud billing projects describe "$PROJECT_ID" --format="value(billingEnabled)")" = "True" ] || gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT" >/dev/null
gcloud services enable run.googleapis.com firestore.googleapis.com pubsub.googleapis.com secretmanager.googleapis.com \
  artifactregistry.googleapis.com cloudscheduler.googleapis.com iamcredentials.googleapis.com sts.googleapis.com \
  firebasehosting.googleapis.com firebase.googleapis.com billingbudgets.googleapis.com

step "Firestore (Native mode, $REGION)"
exists gcloud firestore databases describe --database='(default)' || gcloud firestore databases create --location="$REGION" --type=firestore-native

step "Artifact Registry (keeps the 2 newest images of each service)"
exists gcloud artifacts repositories describe timirtbet --location="$REGION" || \
  gcloud artifacts repositories create timirtbet --repository-format=docker --location="$REGION"
cat > /tmp/timirtbet-cleanup.json <<'JSON'
[{"name":"keep-2","action":{"type":"Keep"},"mostRecentVersions":{"keepCount":2}},
 {"name":"delete-old","action":{"type":"Delete"},"condition":{"olderThan":"1d"}}]
JSON
gcloud artifacts repositories set-cleanup-policies timirtbet --location="$REGION" --policy=/tmp/timirtbet-cleanup.json --no-dry-run >/dev/null

step "Service accounts"
for name in timirtbet-api timirtbet-grader tasks-invoker timirtbet-deploy; do
  exists gcloud iam service-accounts describe "$(sa $name)" || gcloud iam service-accounts create "$name" --display-name="$name"
done
# The grader gets no roles at all.
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$(sa timirtbet-api)" --role=roles/datastore.user --condition=None >/dev/null
for role in roles/run.admin roles/artifactregistry.writer roles/firebasehosting.admin roles/pubsub.admin roles/cloudscheduler.admin; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$(sa timirtbet-deploy)" --role="$role" --condition=None >/dev/null
done
for runtime in timirtbet-api timirtbet-grader tasks-invoker; do
  gcloud iam service-accounts add-iam-policy-binding "$(sa $runtime)" --member="serviceAccount:$(sa timirtbet-deploy)" --role=roles/iam.serviceAccountUser >/dev/null
done

step "Secrets (4)"
secret() { # name, value-from-stdin
  exists gcloud secrets describe "$1" || gcloud secrets create "$1" --replication-policy=automatic >/dev/null
  gcloud secrets versions add "$1" --data-file=- >/dev/null
  gcloud secrets add-iam-policy-binding "$1" --member="serviceAccount:$(sa timirtbet-api)" --role=roles/secretmanager.secretAccessor >/dev/null
}
if ! exists gcloud secrets describe github-app-key; then secret github-app-key < "$GITHUB_APP_PRIVATE_KEY_FILE"; fi
if ! exists gcloud secrets describe github-client-secret; then read -rsp "GitHub App client secret: " CS; echo; printf '%s' "$CS" | secret github-client-secret; fi
if ! exists gcloud secrets describe github-webhook-secret; then
  WH=$(openssl rand -hex 32); printf '%s' "$WH" | secret github-webhook-secret
  echo "Webhook secret (paste into the GitHub App settings): $WH"
fi
if ! exists gcloud secrets describe session-secret; then openssl rand -hex 32 | tr -d '\n' | secret session-secret; fi

step "Pub/Sub topics"
exists gcloud pubsub topics describe grading-jobs || gcloud pubsub topics create grading-jobs
exists gcloud pubsub topics describe grading-failed || gcloud pubsub topics create grading-failed
gcloud pubsub topics add-iam-policy-binding grading-jobs --member="serviceAccount:$(sa timirtbet-api)" --role=roles/pubsub.publisher >/dev/null
PUBSUB_AGENT="service-$PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com"
gcloud pubsub topics add-iam-policy-binding grading-failed --member="serviceAccount:$PUBSUB_AGENT" --role=roles/pubsub.publisher >/dev/null
gcloud iam service-accounts add-iam-policy-binding "$(sa tasks-invoker)" --member="serviceAccount:$PUBSUB_AGENT" --role=roles/iam.serviceAccountTokenCreator >/dev/null

step "Workload Identity Federation for GitHub Actions ($PLATFORM_REPO)"
exists gcloud iam workload-identity-pools describe github --location=global || \
  gcloud iam workload-identity-pools create github --location=global --display-name="GitHub Actions"
exists gcloud iam workload-identity-pools providers describe github-actions --workload-identity-pool=github --location=global || \
  gcloud iam workload-identity-pools providers create-oidc github-actions --workload-identity-pool=github --location=global \
    --issuer-uri=https://token.actions.githubusercontent.com \
    --attribute-mapping=google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref \
    --attribute-condition="assertion.repository=='$PLATFORM_REPO' && assertion.ref=='refs/heads/main'"
gcloud iam service-accounts add-iam-policy-binding "$(sa timirtbet-deploy)" --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$PLATFORM_REPO" >/dev/null

step "Firebase Hosting"
npx -y firebase-tools@15 projects:addfirebase "$PROJECT_ID" 2>/dev/null || echo "(Firebase already added to this project, or add it in the Firebase console)"

step "Budget alert (\$1, \$5, \$20)"
gcloud billing budgets list --billing-account="$BILLING_ACCOUNT" --format='value(displayName)' | grep -qx timirtbet || \
  gcloud billing budgets create --billing-account="$BILLING_ACCOUNT" --display-name=timirtbet --budget-amount=20 \
    --filter-projects="projects/$PROJECT_ID" --threshold-rule=percent=0.05 --threshold-rule=percent=0.25 --threshold-rule=percent=1.0 || echo "Budget skipped: create one in the console under Billing > Budgets"

API_URL="https://timirtbet-api-$PROJECT_NUMBER.$REGION.run.app"
# GitHub rejects variable names that start with GITHUB_, hence the TIMIRTBET_ prefix.
VARS=(
  "GCP_PROJECT_ID=$PROJECT_ID"
  "GCP_PROJECT_NUMBER=$PROJECT_NUMBER"
  "GCP_REGION=$REGION"
  "GCP_WIF_PROVIDER=projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-actions"
  "GCP_DEPLOY_SA=$(sa timirtbet-deploy)"
  "TIMIRTBET_GITHUB_ORG=$GITHUB_ORG"
  "TIMIRTBET_APP_ID=$GITHUB_APP_ID"
  "TIMIRTBET_APP_INSTALLATION_ID=$GITHUB_APP_INSTALLATION_ID"
  "TIMIRTBET_CLIENT_ID=$GITHUB_CLIENT_ID"
  "APP_URL=${APP_URL:-https://$PROJECT_ID.web.app}"
)

step "GitHub repository variables ($PLATFORM_REPO)"
if command -v gh >/dev/null && gh repo view "$PLATFORM_REPO" >/dev/null 2>&1; then
  for kv in "${VARS[@]}"; do gh variable set "${kv%%=*}" --repo "$PLATFORM_REPO" --body "${kv#*=}"; done
  echo "Set ${#VARS[@]} variables on $PLATFORM_REPO."
else
  echo "Could not reach $PLATFORM_REPO with gh. Add these by hand (Settings -> Secrets and variables -> Actions -> Variables),"
  echo "or create the repository and run this script again:"
  for kv in "${VARS[@]}"; do printf '  %-30s %s\n' "${kv%%=*}" "${kv#*=}"; done
fi

cat <<DONE

Done. In the GitHub App settings use:
  Callback URL   ${APP_URL:-https://$PROJECT_ID.web.app}/api/auth/github/callback
  Webhook URL    $API_URL/api/hooks/github
Then push to main (or re-run the workflow): it tests, builds and deploys everything.
DONE
