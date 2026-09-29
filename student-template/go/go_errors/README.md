# Wrapped errors

**Errors** · Go · advanced

Declare `var ErrInvalidAge = errors.New("invalid age")`. Write `ParseAge(s string) (int, error)` that returns a whole number from 0 to 150. For anything else, return an error that wraps `ErrInvalidAge` with `fmt.Errorf` and `%w`, and includes the input, so `errors.Is(err, ErrInvalidAge)` is true.

Edit `solution.go`, then commit and push. Your tests run automatically.
