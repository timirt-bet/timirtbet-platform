# Validate an age

**Error handling** · JavaScript · advanced

Create a `ValidationError` class that extends `Error` and sets `name` to "ValidationError". Write `parseAge(input)` that converts `input` to a whole number from 0 to 150, or throws `ValidationError("Invalid age: INPUT")`. Then write `safeParseAge(input)` that never throws: it returns `{ ok: true, value }` or `{ ok: false, error }` with the error message.

Edit `solution.js`, then commit and push. Your tests run automatically.
