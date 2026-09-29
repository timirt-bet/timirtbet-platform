// Runs the store contract against the Firestore emulator: npm run test:firestore
import { test } from "node:test";
import { FirestoreStore } from "../src/store/firestore.mjs";
import { storeContract } from "./store-contract.mjs";

let n = 0;
// A fresh database namespace per test: each test gets its own collection prefix via a separate emulator project.
storeContract(test, async () => new FirestoreStore({ projectId: `demo-timirtbet-${process.pid}-${n++}` }));
