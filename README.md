# Timirtbet | ትምህርት ቤት

Timirtbet is a free, open-source platform for teaching programming. Learners solve JavaScript and Go challenges in their own GitHub repository, and every finished module is reviewed by a classmate in their **review circle**. The author rates that review, and good reviewers earn reputation. Learners sign in with GitHub; nothing else about them is collected.

It was built for Ethiopian schools and is released under the [Apache License 2.0](LICENSE), so any school, university, training center or ministry can run it, change it and share it.

**Live instance:** https://timirtbet-509915.web.app

## What it does

- **32 challenges** (15 JavaScript, 17 Go) in 8 modules of 3–5, from variables to concurrency. Learners write code in their own GitHub repository and commit it, then press **Run the tests** on the challenge page. The grader checks what is on `main`, and the tests tick off one by one.
- **Peer review per module.** When a learner passes every challenge in a module, one classmate who also finished it reviews all of the solutions together, using a short rubric and a written comment.
- **A 72-hour review clock.** The author sees who is reviewing their module and how long is left, and can nudge the reviewer. The reviewer sees the same countdown. Late reviews move to someone else.
- **Profiles and following.** Every learner has a profile with their progress and reviewer level, and can follow classmates.
- **Reputation.** Authors rate reviews ★1–5. Reviewers move through New, Helpful, Trusted and Mentor. Mentors give second opinions on ★1 reviews.
- **Review circles** of up to 8 friends or classmates, joined with an invite code.
- **Notifications** in the app and through GitHub (email or mobile), so nobody needs to hand over an email address.
- **English and Amharic,** light and dark themes, and it works on phones.
- **Git for real:** every learner gets a private repository and can push solutions from their own computer.

## Use it at your school

You can run your own copy on the Google Cloud free tier, under your own GitHub organization. Nothing in the code is tied to ours.

1. **Fork or clone** this repository.
2. **Follow [docs/DEPLOY.md](docs/DEPLOY.md).** It takes about an hour, all in a browser and Google Cloud Shell. You need a GitHub organization and a Google Cloud project with billing turned on; a school-sized deployment normally stays within the free tier.
3. **Make it yours** (see below).

## Customize it

| To change | Edit |
|---|---|
| Challenges (text, tests, starter code) | `authoring/ex_js.mjs`, `authoring/ex_go.mjs`, then `node authoring/build.mjs` |
| Modules (how challenges are grouped for review) | `challenges/modules.json` |
| Amharic text | `web/src/next/messages/am.js` (one line per message, next to `en.js`; the tests fail if a message has no Amharic) |
| Name, logo letter, colors | `web/src/shell.html`, `web/src/base.css` |
| Review rules (levels, points, reassign times) | `platform/src/reviews.mjs`, `platform/src/pipeline.mjs` |
| GitHub team and template names | `GITHUB_LEARNERS_TEAM`, `GITHUB_TEMPLATE_REPO` environment variables |

How the pieces fit together: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run it on your computer (no accounts needed)

You need Node 22+ and Go 1.22+.

```sh
(cd web && npm ci) && node web/build.mjs --live
cd platform && npm install
node src/main.mjs dev
```

Then open `http://localhost:8080/api/auth/dev?login=your-name`. Open a second name in a private window to act as a second learner. Development mode keeps data in memory, grades in-process and logs GitHub calls instead of making them.

## Tests

```sh
cd platform && npm test      # API flows, grader, both stores, reputation, circles, sign-in, notifications
npm run test:firestore       # the store checks against the Firestore emulator (needs firebase-tools and Java)
node authoring/build.mjs     # every starter fails its tests (and every answer passes, if you have them)
cd ../web && npm test        # builds the site, type-checks the new code, then 23 browser tests of every flow
```

**About the answers.** Reference answers to the challenges are not in this repository, so learners can't copy them. They are kept in a separate private repository for maintainers. Without them, everything still builds and runs, and the few tests that need a passing answer are skipped. Schools running their own copy can write their own answers in `solutions/js/<id>.js` and `solutions/go/<id>.go`; that folder is ignored by git. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Folders

| Folder | What it is |
|---|---|
| `web/` | The web app. `node web/build.mjs --live` builds `web/dist/index.html`, which talks to `/api`. Without `--live` it builds a self-contained demo |
| `platform/` | The API and the grader service (Node 22). Firestore in production, an in-memory store in development |
| `challenges/` | Tests, graders, `exercises.json` and `modules.json`. Published as its own public repository, which learners' repositories use |
| `student-template/` | The private repository every learner gets on first sign-in |
| `authoring/` | Challenge sources and the build that checks them |
| `deploy/` | Dockerfiles, `setup.sh` (one-time Google Cloud setup), `deploy-now.sh` (deploy from Cloud Shell), `sync-repos.sh` (publish `challenges/` and `student-template/`) |
| `.github/workflows/deploy.yml` | Tests every push, and deploys `main` to Cloud Run and Firebase Hosting |

## Contributing

Bug reports, new challenges, translations and fixes are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md). To report a security problem privately, see [SECURITY.md](SECURITY.md).

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
