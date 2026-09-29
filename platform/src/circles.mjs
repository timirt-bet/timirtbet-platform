// Review circles: small groups of learners who review each other's code first.
import crypto from "node:crypto";

export const MAX_MEMBERS = 8;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I

export class CircleError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const inviteCode = () => Array.from(crypto.randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join("");

export async function leaveCircle(store, learnerId) {
  const me = await store.getLearner(learnerId);
  if (!me || !me.circleId) return null;
  const c = await store.getCircle(me.circleId);
  await store.upsertLearner(learnerId, { circleId: null });
  if (!c) return null;
  const members = c.members.filter((m) => m !== learnerId);
  if (!members.length) { await store.deleteCircle(c.id); return null; }
  return store.updateCircle(c.id, { members, ownerId: c.ownerId === learnerId ? members[0] : c.ownerId });
}

export async function createCircle(store, { name, track, ownerId }) {
  name = String(name || "").trim();
  if (name.length < 3 || name.length > 40) throw new CircleError(422, "A circle name needs 3 to 40 characters");
  if (!["js", "go", "both"].includes(track)) throw new CircleError(422, "track must be js, go or both");
  await leaveCircle(store, ownerId);
  const c = await store.createCircle({ name, track, ownerId, inviteCode: inviteCode(), members: [ownerId] });
  await store.upsertLearner(ownerId, { circleId: c.id });
  return c;
}

export async function joinCircle(store, { code, learnerId }) {
  const c = await store.circleByCode(String(code || "").trim().toUpperCase());
  if (!c) throw new CircleError(404, "No circle has that invite code");
  if (c.members.includes(learnerId)) return c;
  if (c.members.length >= MAX_MEMBERS) throw new CircleError(409, `This circle is full (${MAX_MEMBERS} members)`);
  await leaveCircle(store, learnerId);
  const fresh = await store.getCircle(c.id); // leaving may not touch it, but read again before writing
  const updated = await store.updateCircle(c.id, { members: [...fresh.members, learnerId] });
  await store.upsertLearner(learnerId, { circleId: c.id });
  return updated;
}

export async function newInviteCode(store, { circleId, learnerId }) {
  const c = await store.getCircle(circleId);
  if (!c || c.ownerId !== learnerId) throw new CircleError(403, "Only the circle's owner can change the invite code");
  return store.updateCircle(c.id, { inviteCode: inviteCode() });
}
