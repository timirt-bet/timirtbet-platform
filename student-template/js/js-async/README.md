# Fetch in parallel

**Async / Promises** · JavaScript · advanced

Write `fetchAll(ids, fetcher)` where `fetcher(id)` returns a Promise. Return a Promise of all results in the same order as `ids`. Requests must run at the same time, not one after another. If any request fails, the returned Promise rejects with that error.

Edit `solution.js`, then commit and push. Your tests run automatically.
