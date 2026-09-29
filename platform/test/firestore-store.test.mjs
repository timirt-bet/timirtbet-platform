import { test } from "node:test";
import { FirestoreStore } from "../src/store/firestore.mjs";
import { fakeFirestore } from "./fake-firestore.mjs";
import { storeContract } from "./store-contract.mjs";
storeContract(test, async () => new FirestoreStore({ db: fakeFirestore() }));
