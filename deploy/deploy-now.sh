#!/usr/bin/env bash
# Deploy the current code from Cloud Shell, without GitHub Actions.
# Does what the deploy job in .github/workflows/deploy.yml does, using deploy/config.env.
# The Pub/Sub subscription and the hourly job already exist, so they are left as they are.
#   cd ~/timirtbet-platform && git pull && bash deploy/deploy-now.sh
set -euo pipefail
cd "$(dirname "$0")/.."
source deploy/config.env
: "${PROJECT_ID:?}" "${REGION:?}" "${GITHUB_ORG:?}" "${GITHUB_APP_ID:?}" "${GITHUB_APP_INSTALLATION_ID:?}" "${GITHUB_CLIENT_ID:?}"
gcloud config set project "$PROJECT_ID" >/dev/null
NUM=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
IMAGES="$REGION-docker.pkg.dev/$PROJECT_ID/timirtbet"
TAG="$(git rev-parse --short HEAD)-$(date +%s)"
API_URL="https://timirtbet-api-$NUM.$REGION.run.app"
APP_URL="${APP_URL:-https://$PROJECT_ID.web.app}"   # set APP_URL in config.env once your own domain is connected
step() { printf '\n== %s\n' "$*"; }

step "Tests"
(cd platform && npm ci --silent && npm test 2>&1 | grep -E '^# (pass|fail)')

step "Build and push images ($TAG)"
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet >/dev/null
docker build -q -f deploy/api.Dockerfile -t "$IMAGES/api:$TAG" .
docker build -q -f deploy/grader.Dockerfile -t "$IMAGES/grader:$TAG" .
docker push -q "$IMAGES/api:$TAG"
docker push -q "$IMAGES/grader:$TAG"

step "Grader"
gcloud run deploy timirtbet-grader --image "$IMAGES/grader:$TAG" --region "$REGION" \
  --service-account "timirtbet-grader@$PROJECT_ID.iam.gserviceaccount.com" \
  --no-allow-unauthenticated --concurrency 1 --cpu 1 --memory 1Gi --min-instances 0 --max-instances 3 --timeout 120 --quiet
GRADER_URL=$(gcloud run services describe timirtbet-grader --region "$REGION" --format='value(status.url)')

step "API"
gcloud run deploy timirtbet-api --image "$IMAGES/api:$TAG" --region "$REGION" \
  --service-account "timirtbet-api@$PROJECT_ID.iam.gserviceaccount.com" \
  --allow-unauthenticated --concurrency 80 --cpu 1 --memory 512Mi --min-instances 0 --max-instances 3 --timeout 300 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GRADER_URL=$GRADER_URL,TASKS_AUDIENCE=$API_URL/api/tasks,TASKS_INVOKER_EMAIL=tasks-invoker@$PROJECT_ID.iam.gserviceaccount.com,GITHUB_ORG=$GITHUB_ORG,GITHUB_APP_ID=$GITHUB_APP_ID,GITHUB_APP_INSTALLATION_ID=$GITHUB_APP_INSTALLATION_ID,GITHUB_CLIENT_ID=$GITHUB_CLIENT_ID,APP_URL=$APP_URL" \
  --set-secrets "GITHUB_APP_PRIVATE_KEY=github-app-key:latest,GITHUB_CLIENT_SECRET=github-client-secret:latest,GITHUB_WEBHOOK_SECRET=github-webhook-secret:latest,SESSION_SECRET=session-secret:latest" \
  --quiet

step "Web app"
APP_URL="$APP_URL" node web/build.mjs --live
npx -y firebase-tools@15 deploy --only hosting --project "$PROJECT_ID" --non-interactive

step "Done: $APP_URL"
