# Contributing to Timirtbet

Thank you for helping. Timirtbet is used by learners in Ethiopia, so changes should work on phones and slow connections, and in both English and Amharic.

## Ways to help

- **Report a bug or suggest an idea:** open an issue with what you did, what you expected and what happened (a screenshot helps).
- **Improve a challenge** or write a new one (see below).
- **Translate:** fix or extend the Amharic in `web/src/next/messages/am.js`. Each message has a key; `en.js` holds the English for the same keys.
- **Fix code:** pick an open issue, or open one first for anything large.

## Set up

You need Node 22+ and Go 1.22+. See "Run it on your computer" in the README; no accounts are needed.

```sh
cd platform && npm install && npm test
node authoring/build.mjs
```

## The web app

Every screen is a Preact component (htm + @preact/signals) in `web/src/next/`. `web/src/app.js` is only the router (addresses, titles, this browser's saved choices) and `web/src/live.js` loads the learner and polls notifications.

- Put screens in `web/src/next/screens/` and shared pieces in `web/src/next/components/`, with `// @ts-check` at the top; `npm run typecheck` checks them. Register a screen in `web/src/next/index.js` under its router view name.
- Shared data comes from `web/src/next/state.js` (signals) and API calls go through `web/src/next/api.js`. Assign new values to a signal; changing an object in place does not redraw the screens.
- Every visible text is a message: `t("key")`, with the English in `web/src/next/messages/en.js` and the Amharic in `am.js` (a test checks both have every key and the same `{placeholders}`).
- Navigation, the challenge bank and modules come through `web/src/next/legacy.js` from the router.
- Keep the `id` and `data-act` attributes the browser tests use (`web/test/`), so the tests keep proving nothing changed for learners.
- `cd web && npm test` builds the page, checks the size budget (100 KB compressed), type-checks, and runs the browser tests against development mode. Flows that need a passing solution are skipped without the reference answers.

## Reference answers

The answers to the challenges are kept out of this public repository so learners can't copy them.

- **Maintainers** clone the private answers into `solutions/` at the repository root (ignored by git): `git clone https://github.com/timirt-bet/solutions.git solutions`. With them, `npm test` runs every test and `node authoring/build.mjs` checks that every answer passes.
- **Everyone else** can work without them. The build still checks that every starter fails, and the tests that need a passing answer are skipped.
- **Never commit an answer** to this repository, in code, tests, docs or the demo. If you write a new challenge, send its answer to a maintainer, who adds it to the private repository.

## Adding a challenge

1. Add an entry to `authoring/ex_js.mjs` or `authoring/ex_go.mjs`: `id`, `level`, `topic`, `title`, `prompt`, `starter`, and the tests (Go also needs `checks`, the in-browser structure checks).
2. Write your answer in `solutions/js/<id>.js` or `solutions/go/<id>.go`.
3. Write a few extra checks that learners won't see: other inputs and edge cases the prompt covers, so an answer that only handles the examples fails. JS: `solutions/hidden/<id>.json`, a list of `{ "t": "..." }` tests. Go: `solutions/hidden/<id>_test.go`, with test functions named `TestHidden...`. Test only what the prompt promises.
4. Run `node authoring/build.mjs`. It refuses to finish unless your answer passes the tests and the extra checks, and the starter fails them.
5. Add the id to a module in `challenges/modules.json`.

## Pull requests

- Keep each pull request to one change, and describe what it does and how you checked it.
- `npm test` must pass. Add a test for new behavior.
- Write user-facing text plainly: add it to `web/src/next/messages/en.js` under a short key, with the Amharic in `am.js` (ask in the pull request if you need help). New screens show it with `t("key")`.
- By sending a pull request you agree to license your work under the Apache License 2.0.
