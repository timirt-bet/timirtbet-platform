// Grading queue. In production a job is published to Pub/Sub, which pushes it to
// POST /api/tasks/grade (with retries and a dead-letter topic). In development and
// tests the same handler runs in-process, one job at a time.
import { publish } from "./gcp.mjs";

export function inProcessQueue() {
  let chain = Promise.resolve(); let handler = null;
  return {
    onJob(h) { handler = h; },
    async publish(job) { chain = chain.then(() => handler(job)).catch((e) => console.error(`job failed: ${e.message}`)); return job.key; },
    idle: () => chain,
  };
}

export function pubsubQueue({ project, topic, getToken, fetchImpl }) {
  return {
    onJob() {}, // jobs arrive through /api/tasks/grade
    publish: (job) => publish({ project, topic, message: job, getToken, fetchImpl }),
    idle: async () => {},
  };
}

// The body Pub/Sub pushes: { message: { data: base64(JSON), messageId }, subscription }
export function jobFromPush(body) {
  const data = body?.message?.data;
  if (!data) return null;
  try { return JSON.parse(Buffer.from(data, "base64").toString("utf8")); } catch { return null; }
}
