# Timirtbet web app

`timirtbet.html` is the built app (page body only, as published). To open it locally:
`(echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'; cat timirtbet.html) > index.html`

`src/` holds the sources: `shell.html` + `base.css` + `code.css` + `app.css` + `app.js`. The build inlines the exercise bank,
the JS test harness and the Go structure checks from `../authoring/`.

The prototype simulates other learners, circles and ratings in the browser. Wiring it to the API
(`/api/me`, `/api/circles`, `/api/reviews/queue`, `/api/submissions/...`) is the next step.
