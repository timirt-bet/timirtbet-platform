# Security

Please do not open a public issue for security problems.

Report them privately through GitHub: this repository → **Security** → **Report a vulnerability**. Include what you found, how to reproduce it and what an attacker could do. We aim to reply within 7 days.

Useful to know:

- Learner code runs only in the grader service, which has no credentials and no database access. Operators should also block its internet access (see `docs/DEPLOY.md`, "Before real students").
- Secrets (GitHub App key, client secret, webhook secret, session secret) live in Google Secret Manager, never in this repository.
- Sign-in asks GitHub for no scopes; Timirtbet stores only a learner's GitHub id and username.

If you run your own copy, you are responsible for keeping it updated.
