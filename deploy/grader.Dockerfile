# Timirtbet grader (Cloud Run: timirtbet-grader). Runs learners' code: no credentials,
# no database, one request per instance. Build from the repository root:
#   docker build -f deploy/grader.Dockerfile -t grader .
FROM golang:1.24-bookworm AS go
FROM node:22-bookworm-slim
COPY --from=go /usr/local/go /usr/local/go
RUN apt-get update && apt-get install -y --no-install-recommends gcc libc6-dev ca-certificates && rm -rf /var/lib/apt/lists/*
ENV PATH="/usr/local/go/bin:${PATH}" GOPROXY=off GOTOOLCHAIN=local GOFLAGS=-mod=mod CGO_ENABLED=1 \
    GOCACHE=/tmp/go-cache GOPATH=/tmp/go NODE_ENV=production CHALLENGES_DIR=/app/challenges
WORKDIR /app/platform
COPY platform/package.json ./
COPY platform/src ./src
COPY challenges /app/challenges
# Warm the Go build cache for the standard library (with the race detector) so the first grading is fast.
RUN mkdir -p /tmp/warm && cd /tmp/warm && printf 'module w\n\ngo 1.22\n' > go.mod \
 && printf 'package w\nimport ("sync";"testing")\nfunc TestW(t *testing.T){var m sync.Mutex;m.Lock();m.Unlock()}\n' > w_test.go \
 && go test -race ./... && chmod -R a+rwX /tmp/go-cache && rm -rf /tmp/warm
USER node
CMD ["node", "src/main.mjs", "grader"]
