// Teacher views: create a class, a learner joins with the code from their Profile, their runs
// show in the class grid, the teacher opens one learner, downloads the CSV and removes them.
import test from "node:test";
import assert from "node:assert/strict";
import { startSite } from "./harness.mjs";

const site = await startSite();
test.after(() => site.stop());
const GENERAL = 'function describe(v) { return v === null ? "null" : Array.isArray(v) ? "array" : typeof v; }\n';

test("a teacher creates a class, a learner joins, and the grid shows their progress", async () => {
  const teacher = await site.learner("teach-t");
  await teacher.open("/teach");
  assert.equal(await teacher.locator("#classList .cls-card").count(), 0);
  await teacher.fill("#clsName", "Grade 10 A");
  await teacher.locator('[data-form="new-class"] button[type="submit"]').click();
  await teacher.waitForSelector("#classCode");
  assert.match(teacher.url(), /\/teach\/cls_\w+$/);
  const code = await teacher.text("#classCode");
  assert.match(code, /^[A-Z2-9]{8}$/);
  assert.match(await teacher.text(".empty-cls"), new RegExp(code));

  const learner = await site.learner("teach-l1");
  await learner.open("/profile");
  await learner.fill("#classJoin", code.toLowerCase());
  await learner.locator('[data-form="join-class"] button[type="submit"]').click();
  await learner.waitForSelector('[data-act="ask-leave-class"]');
  assert.match(await learner.text("#classCard"), /Grade 10 A · teacher @teach-t/);
  // A learner cannot open the class.
  const cid = new URL(teacher.url()).pathname.split("/")[2];
  assert.equal((await learner.api("GET", `/api/classes/${cid}`)).status, 404);

  await learner.push("js-vars", GENERAL);
  await learner.push("js-cond", "function grade(s) { return 'A'; }");

  await teacher.reload(); await teacher.ready();
  await teacher.waitForSelector("#classGrid");
  const row = teacher.locator('#classGrid tbody tr[data-learner="teach-l1"]');
  assert.equal(await row.locator(".dot.passed").count(), 1);
  assert.equal(await row.locator(".dot.tried").count(), 1);
  assert.match(await row.locator(".dot.passed").getAttribute("title"), /What type is it\?: Passed/);
  assert.equal(await teacher.getAttribute("#csvLink", "href"), `/api/classes/${cid}/export.csv`);
  const csv = await teacher.evaluate(async (u) => (await fetch(u)).text(), `/api/classes/${cid}/export.csv`);
  assert.match(csv, /teach-l1,1,2,0,0,[^,]+,passed,tried,/);

  await row.click();
  await teacher.waitForSelector("#learnerTable");
  assert.match(teacher.url(), new RegExp(`/teach/${cid}/gh_\\d+$`));
  assert.equal(await teacher.text("#learnerName"), "@teach-l1");
  assert.match(await teacher.text('#learnerTable tr[data-ex="js-cond"]'), /Tried/);

  await teacher.locator('[data-act="ask-remove"]').click();
  await teacher.locator('[data-act="remove-learner"]').click();
  await teacher.waitForSelector(".empty-cls");
  await learner.open("/profile");
  assert.equal(await learner.locator("#classJoin").count(), 1, "back to the join form");
  await teacher.close(); await learner.close();
});

test("the account menu leads to Teach, and the class list opens a class", async () => {
  const p = await site.learner("teach-m");
  await p.open("/");
  await p.locator(".who").click();
  await p.locator('[data-act="menu-teach"]').click();
  await p.waitForSelector('[data-form="new-class"]');
  assert.match(p.url(), /\/teach$/);
  await p.api("POST", "/api/classes", { name: "Coding club" });
  await p.open("/teach");
  await p.locator('#classList [data-act="open-class"]').first().click();
  await p.waitForSelector("#className");
  assert.equal(await p.text("#className"), "Coding club");
  await p.locator('[data-act="ask-delete-class"]').click();
  await p.locator('[data-act="delete-class"]').click();
  await p.waitForSelector('[data-form="new-class"]');
  assert.equal(await p.locator("#classList .cls-card").count(), 0);
  await p.close();
});
