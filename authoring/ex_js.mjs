// JavaScript exercise bank. Tests are JS statements run with the harness helpers:
// eq(actual, expected), near(actual, expected), ok(cond, msg), throws(fn, ErrorType), sleep(ms)
export const JS = [
{
  id: "js-vars", lang: "js", level: "basic", topic: "Variables & Types", title: "What type is it?",
  prompt: "Write `describe(value)` that returns the type of `value` as a string: \"number\", \"string\", \"boolean\", \"undefined\", \"null\", \"array\" or \"object\". Watch out: `typeof null` and `typeof []` both give \"object\".",
  starter: `function describe(value) {
  // your code here
}
`,
  tests: [
    { n: "numbers", t: `eq(describe(42), "number"); eq(describe(3.5), "number");` },
    { n: "strings and booleans", t: `eq(describe("selam"), "string"); eq(describe(false), "boolean");` },
    { n: "undefined", t: `eq(describe(undefined), "undefined");` },
    { n: "null is not an object here", t: `eq(describe(null), "null");` },
    { n: "arrays are reported as array", t: `eq(describe([1, 2]), "array"); eq(describe([]), "array");` },
    { n: "plain objects", t: `eq(describe({ city: "Adama" }), "object");` },
  ],
},
{
  id: "js-cond", lang: "js", level: "basic", topic: "Conditions", title: "Letter grades",
  prompt: "Write `grade(score)` for a score from 0 to 100. Return \"A\" for 90 and above, \"B\" for 80–89, \"C\" for 70–79, \"D\" for 60–69 and \"F\" below 60. Scores below 0 or above 100 return \"invalid\".",
  starter: `function grade(score) {
  // your code here
}
`,
  tests: [
    { n: "A at 90 and above", t: `eq(grade(95), "A"); eq(grade(90), "A"); eq(grade(100), "A");` },
    { n: "B and C bands", t: `eq(grade(85), "B"); eq(grade(80), "B"); eq(grade(72), "C");` },
    { n: "D and F boundary", t: `eq(grade(60), "D"); eq(grade(59), "F"); eq(grade(0), "F");` },
    { n: "out of range is invalid", t: `eq(grade(-5), "invalid"); eq(grade(101), "invalid");` },
  ],
},
{
  id: "js-loops", lang: "js", level: "basic", topic: "Loops", title: "Sum with a loop",
  prompt: "Write `sumTo(n)` that adds every whole number from 1 to `n` using a loop. `sumTo(0)` is 0.",
  starter: `function sumTo(n) {
  // your code here
}
`,
  tests: [
    { n: "small numbers", t: `eq(sumTo(1), 1); eq(sumTo(5), 15);` },
    { n: "zero", t: `eq(sumTo(0), 0);` },
    { n: "one hundred", t: `eq(sumTo(100), 5050);` },
  ],
},
{
  id: "js-func", lang: "js", level: "basic", topic: "Functions", title: "Greet in three languages",
  prompt: "Write `greet(name, lang)` where `lang` defaults to \"en\". Return \"Hello, NAME!\" for \"en\", \"ሰላም, NAME!\" for \"am\" and \"Akkam, NAME!\" for \"om\" (Afaan Oromo). Any other language falls back to English.",
  starter: `function greet(name, lang) {
  // your code here
}
`,
  tests: [
    { n: "English by default", t: `eq(greet("Hana"), "Hello, Hana!");` },
    { n: "Amharic", t: `eq(greet("Hana", "am"), "ሰላም, Hana!");` },
    { n: "Afaan Oromo", t: `eq(greet("Gemechu", "om"), "Akkam, Gemechu!");` },
    { n: "unknown language falls back", t: `eq(greet("Sara", "fr"), "Hello, Sara!");` },
  ],
},
{
  id: "js-arrays", lang: "js", level: "basic", topic: "Arrays", title: "Class average",
  prompt: "Write `average(nums)` that returns the mean of an array of numbers. An empty array returns 0.",
  starter: `function average(nums) {
  // your code here
}
`,
  tests: [
    { n: "whole-number mean", t: `eq(average([2, 4, 6]), 4);` },
    { n: "fractional mean", t: `near(average([1, 2]), 1.5);` },
    { n: "single value", t: `eq(average([7]), 7);` },
    { n: "empty array", t: `eq(average([]), 0);` },
  ],
},
{
  id: "js-objects", lang: "js", level: "basic", topic: "Objects", title: "Count the words",
  prompt: "Write `countWords(sentence)` that returns an object mapping each lowercase word to how many times it appears. Words are separated by any amount of whitespace.",
  starter: `function countWords(sentence) {
  // your code here
}
`,
  tests: [
    { n: "repeated words", t: `eq(countWords("the cat the dog"), { the: 2, cat: 1, dog: 1 });` },
    { n: "case and extra spaces", t: `eq(countWords("  Addis   addis "), { addis: 2 });` },
    { n: "empty sentence", t: `eq(countWords(""), {});` },
  ],
},
{
  id: "js-basic-ps", lang: "js", level: "basic", topic: "Basic problem solving", title: "Palindrome check",
  prompt: "Write `isPalindrome(text)` that returns true when `text` reads the same forwards and backwards, ignoring case, spaces and punctuation (compare letters a–z and digits only).",
  starter: `function isPalindrome(text) {
  // your code here
}
`,
  tests: [
    { n: "simple word", t: `eq(isPalindrome("Racecar"), true);` },
    { n: "sentence with punctuation", t: `eq(isPalindrome("A man, a plan, a canal: Panama"), true);` },
    { n: "not a palindrome", t: `eq(isPalindrome("Addis"), false);` },
    { n: "empty string", t: `eq(isPalindrome(""), true);` },
  ],
},
{
  id: "js-closures", lang: "js", level: "advanced", topic: "Closures", title: "Private counter",
  prompt: "Write `makeCounter(start)` (default 0) that returns an object with `inc()`, `dec()` and `value()`. `inc` and `dec` return the new value. The count must stay private: the returned object has only those three methods.",
  starter: `function makeCounter(start) {
  // your code here
}
`,
  tests: [
    { n: "counts up", t: `const c = makeCounter(); c.inc(); eq(c.inc(), 2); eq(c.value(), 2);` },
    { n: "custom start and dec", t: `eq(makeCounter(10).dec(), 9);` },
    { n: "counters are independent", t: `const a = makeCounter(), b = makeCounter(); a.inc(); a.inc(); b.inc(); eq([a.value(), b.value()], [2, 1]);` },
    { n: "state is private", t: `eq(Object.keys(makeCounter()).sort(), ["dec", "inc", "value"]);` },
  ],
},
{
  id: "js-this", lang: "js", level: "advanced", topic: "this", title: "A chainable account",
  prompt: "Write `createAccount(owner)` returning an object with `owner`, `balance` (starts at 0), `deposit(n)` and `withdraw(n)`. Both methods must use `this`, change `this.balance` and return `this` so calls can be chained. Withdrawing more than the balance throws an Error with the message \"Insufficient funds\".",
  starter: `function createAccount(owner) {
  // your code here
}
`,
  tests: [
    { n: "chained calls", t: `const a = createAccount("Hana"); a.deposit(100).withdraw(30); eq(a.balance, 70);` },
    { n: "bind keeps this", t: `const a = createAccount("Hana"); const d = a.deposit.bind(a); d(5); eq(a.balance, 5);` },
    { n: "methods really use this", t: `const a = createAccount("A"), b = createAccount("B"); b.deposit.call(a, 20); eq([a.balance, b.balance], [20, 0]);` },
    { n: "overdraw throws", t: `const e = throws(() => createAccount("X").withdraw(1), Error); eq(e.message, "Insufficient funds");` },
  ],
},
{
  id: "js-proto", lang: "js", level: "advanced", topic: "Prototypes", title: "Shapes with prototypes",
  prompt: "`Shape` is given. Write a `Circle(r)` constructor that inherits from `Shape` through the prototype chain (call `Shape` with the name \"circle\"). Put an `area()` method on `Circle.prototype` that returns π·r². Do not copy `describe` onto Circle.",
  starter: `function Shape(name) {
  this.name = name;
}
Shape.prototype.describe = function () {
  return this.name + " with area " + this.area().toFixed(2);
};

function Circle(r) {
  // your code here
}
`,
  tests: [
    { n: "area", t: `near(new Circle(2).area(), 12.566370614359172);` },
    { n: "inherits describe", t: `eq(new Circle(1).describe(), "circle with area 3.14");` },
    { n: "instanceof Shape", t: `ok(new Circle(1) instanceof Shape, "Circle should inherit from Shape");` },
    { n: "describe lives on Shape only", t: `ok(!Object.prototype.hasOwnProperty.call(Circle.prototype, "describe"), "describe was copied onto Circle.prototype");` },
  ],
},
{
  id: "js-arraymethods", lang: "js", level: "advanced", topic: "Array methods", title: "Top students",
  prompt: "Write `topStudents(students, min)` where each student is `{ name, score }`. Return the names of students scoring at least `min`, highest score first; equal scores are ordered by name A–Z. Use `filter`, `sort` and `map`, and do not change the input array.",
  starter: `function topStudents(students, min) {
  // your code here
}
`,
  tests: [
    { n: "filters and sorts", t: `eq(topStudents([{name:"Abel",score:70},{name:"Sara",score:92},{name:"Liya",score:85}], 80), ["Sara", "Liya"]);` },
    { n: "ties sorted by name", t: `eq(topStudents([{name:"Yonas",score:90},{name:"Bethel",score:90}], 50), ["Bethel", "Yonas"]);` },
    { n: "nobody qualifies", t: `eq(topStudents([{name:"Abel",score:40}], 50), []);` },
    { n: "input is unchanged", t: `const list = [{name:"B",score:1},{name:"A",score:2}]; topStudents(list, 0); eq(list[0].name, "B");` },
  ],
},
{
  id: "js-async", lang: "js", level: "advanced", topic: "Async / Promises", title: "Fetch in parallel",
  prompt: "Write `fetchAll(ids, fetcher)` where `fetcher(id)` returns a Promise. Return a Promise of all results in the same order as `ids`. Requests must run at the same time, not one after another. If any request fails, the returned Promise rejects with that error.",
  starter: `async function fetchAll(ids, fetcher) {
  // your code here
}
`,
  tests: [
    { n: "keeps order", t: `const r = await fetchAll([3, 1, 2], (id) => sleep(id * 10).then(() => id * 100)); eq(r, [300, 100, 200]);` },
    { n: "runs in parallel", t: `const t0 = Date.now(); await fetchAll([1, 2, 3], () => sleep(60)); ok(Date.now() - t0 < 150, "Requests ran one after another");` },
    { n: "rejects on failure", t: `let err; try { await fetchAll([1, 2], (id) => id === 2 ? Promise.reject(new Error("offline")) : Promise.resolve(id)); } catch (e) { err = e; } eq(err && err.message, "offline");` },
  ],
},
{
  id: "js-eventloop", lang: "js", level: "advanced", topic: "Event loop", title: "Soon and later",
  prompt: "Write two schedulers. `soon(fn)` runs `fn` as a microtask: after the current code finishes but before any timers. `later(fn)` runs `fn` as a macrotask, on a later turn of the event loop.",
  starter: `function soon(fn) {
  // your code here
}

function later(fn) {
  // your code here
}
`,
  tests: [
    { n: "neither runs synchronously", t: `const log = []; soon(() => log.push("soon")); later(() => log.push("later")); log.push("sync"); eq(log, ["sync"]); await sleep(20);` },
    { n: "microtask before macrotask", t: `const log = []; later(() => log.push("later")); soon(() => log.push("soon")); await sleep(20); eq(log, ["soon", "later"]);` },
    { n: "soon beats an earlier timer", t: `const log = []; setTimeout(() => log.push("timeout"), 0); soon(() => log.push("soon")); await sleep(20); eq(log, ["soon", "timeout"]);` },
    { n: "later runs after promise callbacks", t: `const log = []; later(() => log.push("later")); Promise.resolve().then(() => log.push("then")); await sleep(20); eq(log, ["then", "later"]);` },
  ],
},
{
  id: "js-errors", lang: "js", level: "advanced", topic: "Error handling", title: "Validate an age",
  prompt: "Create a `ValidationError` class that extends `Error` and sets `name` to \"ValidationError\". Write `parseAge(input)` that converts `input` to a whole number from 0 to 150, or throws `ValidationError(\"Invalid age: INPUT\")`. Then write `safeParseAge(input)` that never throws: it returns `{ ok: true, value }` or `{ ok: false, error }` with the error message.",
  starter: `class ValidationError extends Error {
  // your code here
}

function parseAge(input) {
  // your code here
}

function safeParseAge(input) {
  // your code here
}
`,
  tests: [
    { n: "valid ages", t: `eq(parseAge("17"), 17); eq(parseAge(0), 0);` },
    { n: "throws ValidationError", t: `const e = throws(() => parseAge("abc"), ValidationError); eq(e.name, "ValidationError"); eq(e.message, "Invalid age: abc");` },
    { n: "range and decimals", t: `throws(() => parseAge(200), ValidationError); throws(() => parseAge("12.5"), ValidationError); throws(() => parseAge(""), ValidationError);` },
    { n: "safe version never throws", t: `eq(safeParseAge("20"), { ok: true, value: 20 }); eq(safeParseAge("-1"), { ok: false, error: "Invalid age: -1" });` },
  ],
},
{
  id: "js-adv-ps", lang: "js", level: "advanced", topic: "Advanced problem solving", title: "LRU cache",
  prompt: "Write `createLRU(capacity)` returning a cache with `get(key)`, `put(key, value)` and `size()`. `get` returns the value or `undefined` and marks the key as recently used. When `put` goes over capacity, remove the least recently used key. Both operations should be O(1); a `Map` keeps insertion order.",
  starter: `function createLRU(capacity) {
  // your code here
}
`,
  tests: [
    { n: "stores and reads", t: `const c = createLRU(2); c.put("a", 1); eq(c.get("a"), 1); eq(c.get("zz"), undefined);` },
    { n: "evicts least recently used", t: `const c = createLRU(2); c.put("a", 1); c.put("b", 2); c.put("c", 3); eq([c.get("a"), c.get("b"), c.get("c")], [undefined, 2, 3]);` },
    { n: "get refreshes a key", t: `const c = createLRU(2); c.put("a", 1); c.put("b", 2); c.get("a"); c.put("c", 3); eq([c.get("a"), c.get("b")], [1, undefined]);` },
    { n: "updating keeps size", t: `const c = createLRU(2); c.put("a", 1); c.put("a", 5); eq([c.size(), c.get("a")], [1, 5]);` },
  ],
},
];
