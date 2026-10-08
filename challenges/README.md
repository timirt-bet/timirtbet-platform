# Timirtbet challenges

The tests for [Timirtbet](https://github.com/timirt-bet/timirtbet-platform)'s JavaScript and Go challenges. The platform's grader and the learners' own repositories both read from here. Learners never edit this repository.

- `exercises.json`: every exercise: id, language, level, topic, task text, starter code, JavaScript tests, Go test file and in-browser structure checks.
- `modules.json`: how the challenges are grouped into modules for peer review.
- `js/`: the JavaScript grader (`grade.mjs`). Each test runs in a locked-down realm in its own worker; see the comment at the top of the file.
- `go/<exercise>/`: the real `_test.go` file and the starter for each Go exercise; `go/grade.sh` grades one file.

This repository is generated: edit the sources in the platform repository's `authoring/` folder and run `node authoring/build.mjs`.

## Grade one submission

```sh
node js/grade.mjs js-loops path/to/solution.js     # prints JSON, exit code 0 when all tests pass
./go/grade.sh go-sync path/to/solution.go          # go test -v -race; GRADE_JSON=1 for JSON
```

## Reference answers

The answers are kept in a private repository so learners can't copy them. Maintainers check them with:

```sh
SOLUTIONS_DIR=/path/to/solutions node test_all.mjs
```

## Curriculum

| Language | Basic | Advanced |
|---|---|---|
| JavaScript | Variables & Types, Conditions, Loops, Functions, Arrays, Objects, Basic problem solving | Closures, this, Prototypes, Array methods, Async / Promises, Event loop, Error handling, Advanced problem solving |
| Go | Variables & Types, Conditions, Loops, Functions, Slices, Maps, Structs, Basic problem solving | Pointers, Methods, Interfaces, Errors, Packages, Goroutines, Channels, Synchronization, Advanced problem solving |

This repository must be **public** (or internal to the organization) so learners' repositories can check it out in GitHub Actions without a token. The tests are not secret.

Licensed under the Apache License 2.0, like the platform.
