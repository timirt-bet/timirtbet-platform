// How the API reaches the grader: in-process for development, or the private
// Cloud Run grader service (called with a Google ID token) in production.
import { gradeCode } from "./grader.mjs";

export function localGrader({ bank, challengesDir }) {
  return { grade: (items) => gradeCode({ items, bank, challengesDir }) };
}

export function remoteGrader({ url, idToken, fetchImpl = globalThis.fetch }) {
  return {
    async grade(items) {
      const res = await fetchImpl(`${url}/grade`, {
        method: "POST",
        headers: { authorization: `Bearer ${await idToken(url)}`, "content-type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error(`grader returned ${res.status}`);
      return (await res.json()).results;
    },
  };
}
