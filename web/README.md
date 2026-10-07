# Timirtbet web app

One self-contained page, `dist/index.html`, built by `node build.mjs --live` and served by Firebase Hosting
(or by the API in development: `node platform/src/main.mjs dev`). It talks to the API under `/api`.

- `src/shell.html`, `base.css`, `code.css`, `app.css`: the page shell and styles (light and dark).
- `src/app.js`: the router. Addresses, titles, and this browser's saved choices.
- `src/live.js`: loads the learner from the API, keeps each account's choices apart, polls notifications.
- `src/next/`: every screen and component (Preact + htm + @preact/signals), messages in English and Amharic.
- `test/`: browser tests (Playwright) against development mode, plus message checks.

`npm test` builds the page, checks the size budget (100 KB compressed), type-checks and runs the tests.
