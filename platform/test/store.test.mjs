import { test } from "node:test";
import { MemoryStore } from "../src/store/memory.mjs";
import { storeContract } from "./store-contract.mjs";
storeContract(test, async () => new MemoryStore());
