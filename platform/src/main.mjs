// Entry point.
//   node src/main.mjs api     -> the API (Cloud Run timirtbet-api)
//   node src/main.mjs grader  -> the grader (Cloud Run timirtbet-grader)
//   node src/main.mjs dev     -> API + in-process grader and queue + memory store (local development)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { loadBank, loadModules } from "./exercises.mjs";

const mode = process.argv[2] || "api";
const env = process.env;
const need = (k) => { if (!env[k]) { console.error(`Missing environment variable ${k}`); process.exit(1); } return k.endsWith("PRIVATE_KEY") ? env[k] : env[k].trim(); };
const challengesDir = path.resolve(env.CHALLENGES_DIR || new URL("../../challenges", import.meta.url).pathname);
const bank = loadBank(challengesDir);
const modules = loadModules(challengesDir);
const port = +(env.PORT || 8080);

if (mode === "grader") {
  const { createGraderApp } = await import("./grader-server.mjs");
  http.createServer(createGraderApp({ bank, challengesDir })).listen(port, () => console.log(`Timirtbet grader on :${port}`));
} else {
  const { createApp } = await import("./server.mjs");
  const { createGitHub } = await import("./github.mjs");
  const { installationTokenProvider } = await import("./app-auth.mjs");
  const { githubOAuth } = await import("./auth.mjs");
  const { fetchRepoTarball } = await import("./pipeline.mjs");
  const dev = mode === "dev";

  // Development without any GitHub credentials: GitHub calls are logged instead of made,
  // and /api/auth/dev?login=<name> signs you in without GitHub.
  const offline = dev && !env.GITHUB_APP_ID && !env.GITHUB_TOKEN;
  let gh;
  if (offline) {
    const note = (name) => async (...args) => { console.log(`[github offline] ${name} ${args.slice(0, 3).join(" ")}`); return name === "listPRFiles" ? [] : { id: 0 }; };
    gh = new Proxy({}, { get: (_, name) => (name === "getToken" ? async () => "offline" : name === "tarballUrl" ? () => "" : note(String(name))) });
    for (const k of ["GITHUB_ORG", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GITHUB_WEBHOOK_SECRET", "SESSION_SECRET", "APP_URL"]) env[k] ||= k === "APP_URL" ? `http://localhost:${port}` : k === "GITHUB_ORG" ? "timirtbet-dev" : "dev-" + k.toLowerCase();
    env.INSECURE_COOKIES = "1";
  } else {
    const token = env.GITHUB_APP_ID
      ? installationTokenProvider({ appId: env.GITHUB_APP_ID, privateKey: env.GITHUB_APP_PRIVATE_KEY || fs.readFileSync(need("GITHUB_APP_PRIVATE_KEY_FILE"), "utf8"), installationId: need("GITHUB_APP_INSTALLATION_ID") })
      : need("GITHUB_TOKEN");
    gh = createGitHub({ token });
  }

  let store, queue, grader, verifyTask = async () => false;
  if (dev && !env.FIRESTORE_EMULATOR_HOST && !env.GOOGLE_CLOUD_PROJECT) {
    const { MemoryStore } = await import("./store/memory.mjs");
    store = new MemoryStore();
  } else {
    const { FirestoreStore } = await import("./store/firestore.mjs");
    store = new FirestoreStore({ projectId: env.GOOGLE_CLOUD_PROJECT });
  }
  if (dev) {
    const { inProcessQueue } = await import("./queue.mjs");
    const { localGrader } = await import("./grader-client.mjs");
    queue = inProcessQueue(); grader = localGrader({ bank, challengesDir });
  } else {
    const { pubsubQueue } = await import("./queue.mjs");
    const { remoteGrader } = await import("./grader-client.mjs");
    const { metadataAccessToken, metadataIdToken, googleTokenVerifier } = await import("./gcp.mjs");
    queue = pubsubQueue({ project: need("GOOGLE_CLOUD_PROJECT"), topic: env.GRADING_TOPIC || "grading-jobs", getToken: metadataAccessToken() });
    grader = remoteGrader({ url: need("GRADER_URL"), idToken: metadataIdToken() });
    verifyTask = googleTokenVerifier({ audience: need("TASKS_AUDIENCE"), email: need("TASKS_INVOKER_EMAIL") });
  }

  const app = createApp({
    store, gh, bank, modules, queue, grader, verifyTask,
    fetchRepo: (owner, repo, sha) => fetchRepoTarball(gh, owner, repo, sha),
    oauth: githubOAuth({ clientId: need("GITHUB_CLIENT_ID"), clientSecret: need("GITHUB_CLIENT_SECRET") }),
    config: {
      org: need("GITHUB_ORG"), studentsTeam: env.GITHUB_LEARNERS_TEAM || "learners", templateRepo: env.GITHUB_TEMPLATE_REPO || "student-template",
      githubClientId: need("GITHUB_CLIENT_ID"), webhookSecret: need("GITHUB_WEBHOOK_SECRET"), sessionSecret: need("SESSION_SECRET"),
      appUrl: need("APP_URL"), secureCookies: env.INSECURE_COOKIES !== "1", devLogin: offline, githubNotify: env.GITHUB_NOTIFY !== "0",
    },
  });
  // In development the API also serves the built web app (node web/build.mjs --live), like Firebase Hosting does.
  const webIndex = new URL("../../web/dist/index.html", import.meta.url).pathname;
  const handler = dev ? (req, res) => {
    if (req.method === "GET" && !req.url.startsWith("/api/")) {
      if (!fs.existsSync(webIndex)) { res.writeHead(404); return res.end("Run: node web/build.mjs --live"); }
      const asset = /^\/(codemirror-[a-f0-9]+\.js)$/.exec(req.url.split("?")[0]); // the editor bundle sits beside index.html
      if (asset) { res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }); return res.end(fs.readFileSync(new URL(asset[1], new URL("../../web/dist/", import.meta.url)))); }
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); return res.end(fs.readFileSync(webIndex));
    }
    return app.handler(req, res);
  } : app.handler;
  http.createServer(handler).listen(port, () => console.log(`Timirtbet API (${mode}) on :${port}${offline ? `  ->  open http://localhost:${port}/api/auth/dev?login=your-name` : ""}`));
}
