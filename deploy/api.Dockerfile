# Timirtbet API (Cloud Run: timirtbet-api). Build from the repository root:
#   docker build -f deploy/api.Dockerfile -t api .
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends tar gzip ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app/platform
COPY platform/package.json platform/package-lock.json ./
RUN npm ci --omit=dev
COPY platform/src ./src
COPY challenges/exercises.json challenges/modules.json /app/challenges/
ENV NODE_ENV=production CHALLENGES_DIR=/app/challenges
USER node
CMD ["node", "src/main.mjs", "api"]
