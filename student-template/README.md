# My Timirtbet code exercises

This repository is yours. Only you and the Timirtbet maintainers can see it.

## How it works

1. Pick an exercise folder, for example `js/js-loops` or `go/go_loops`. Its `README.md` explains the task.
2. Write your answer in `solution.js` or `solution.go`.
3. Commit and push to `main`.
4. Go back to the challenge on Timirtbet and press **Run the tests**. Nothing is checked until you do, so commit as often as you like.
5. When you have passed every challenge in a module, submit the module on Timirtbet. Someone in your review circle who finished it reviews your solutions.
6. Read their review and rate it from 1 to 5 stars. Honest ratings help everyone get better reviews.

## Run the tests on your own computer

```sh
git clone https://github.com/<org>/challenges ../challenges
node ../challenges/js/grade.mjs js-loops js/js-loops/solution.js
sh ../challenges/go/grade.sh go-loops go/go_loops/solution.go
```

You need Node.js 22 and Go 1.22 or newer.

On Timirtbet, your code also runs a few **extra checks** you can't see: other inputs and edge cases from the task. Make sure your solution works in general, not only for the examples in the tests.

## Exercises

JavaScript: `js/` · Go: `go/` (one package per folder; `go/go_packages` is the package `mathx`).
