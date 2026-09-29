// The grader service. It holds no credentials and reads no database: code in, results out.
// Deployed as a private Cloud Run service (1 request per instance), so Cloud Run itself
// rejects any caller without a valid ID token for the API's service account.
import { gradeCode } from "./grader.mjs";

const MAX_ITEMS = 40, MAX_CODE = 64 * 1024, MAX_BODY = 4 * 1024 * 1024;

export function createGraderApp({ bank, challengesDir, log = console.log }) {
  return async (req, res) => {
    const send = (status, body) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
    try {
      if (req.method === "GET" && req.url === "/health") return send(200, { ok: true });
      if (req.method !== "POST" || req.url !== "/grade") return send(404, { error: "not found" });
      const chunks = []; let size = 0;
      for await (const c of req) { size += c.length; if (size > MAX_BODY) return send(413, { error: "too large" }); chunks.push(c); }
      const { items } = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      if (!Array.isArray(items) || !items.length || items.length > MAX_ITEMS) return send(422, { error: `send 1 to ${MAX_ITEMS} items` });
      for (const it of items) {
        if (!bank[it.exerciseId]) return send(422, { error: `unknown exercise ${it.exerciseId}` });
        if (typeof it.code !== "string" || it.code.length > MAX_CODE) return send(422, { error: `code must be a string of at most ${MAX_CODE} bytes` });
      }
      return send(200, { results: await gradeCode({ items, bank, challengesDir }) });
    } catch (e) {
      log(`grader error: ${e.stack || e.message}`);
      return send(500, { error: "internal error" });
    }
  };
}
