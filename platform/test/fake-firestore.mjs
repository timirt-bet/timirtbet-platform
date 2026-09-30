// A small in-memory stand-in for the Firestore client, covering exactly the calls
// FirestoreStore makes. It lets the store contract run here without the emulator;
// `npm run test:firestore` runs the same contract against the real emulator.
import crypto from "node:crypto";

const apply = (cur, patch) => {
  const out = { ...cur };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (v && v.constructor?.name === "NumericIncrementTransform") out[k] = (out[k] || 0) + v.operand;
    else if (v && v.constructor?.name === "ArrayUnionTransform") out[k] = [...new Set([...(out[k] || []), ...v.elements])];
    else if (v && v.constructor?.name === "ArrayRemoveTransform") out[k] = (out[k] || []).filter((x) => !v.elements.includes(x));
    else out[k] = structuredClone(v);
  }
  return out;
};
const snap = (id, d, ref) => ({ id, exists: d !== undefined, data: () => (d === undefined ? undefined : structuredClone(d)), ref });

export function fakeFirestore() {
  const cols = new Map();
  const col = (name) => { if (!cols.has(name)) cols.set(name, new Map()); return cols.get(name); };
  const docRef = (name, id) => ({
    id,
    get: async () => snap(id, col(name).get(id), docRef(name, id)),
    set: async (d, opt) => { col(name).set(id, opt?.merge ? apply(col(name).get(id) || {}, d) : apply({}, d)); },
    create: async (d) => { if (col(name).has(id)) throw Object.assign(new Error("ALREADY_EXISTS"), { code: 6 }); col(name).set(id, apply({}, d)); },
    update: async (d) => { if (!col(name).has(id)) throw Object.assign(new Error("NOT_FOUND"), { code: 5 }); col(name).set(id, apply(col(name).get(id), d)); },
    delete: async () => { col(name).delete(id); },
    _col: name,
  });
  const query = (name, filters = [], lim = Infinity) => ({
    where: (f, op, v) => { if (op !== "==" && op !== "array-contains") throw new Error("fake supports == and array-contains only"); return query(name, [...filters, [f, op, v]], lim); },
    limit: (n) => query(name, filters, n),
    get: async () => {
      const docs = [...col(name).entries()].filter(([, d]) => filters.every(([f, op, v]) => (op === "==" ? d[f] === v : Array.isArray(d[f]) && d[f].includes(v)))).slice(0, lim).map(([id, d]) => snap(id, d, docRef(name, id)));
      return { docs };
    },
  });
  const db = {
    collection: (name) => ({
      ...query(name),
      doc: (id) => docRef(name, id),
      add: async (d) => { const id = crypto.randomBytes(10).toString("hex"); col(name).set(id, apply({}, d)); return docRef(name, id); },
    }),
    getAll: async (...refs) => Promise.all(refs.map((r) => r.get())),
    // Transactions run one at a time here; the real client retries on contention.
    runTransaction: async (fn) => fn({
      get: (ref) => ref.get(),
      set: (ref, d, opt) => ref.set(d, opt),
      update: (ref, d) => ref.update(d),
    }),
  };
  return db;
}
