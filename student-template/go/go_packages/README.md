# Your own package

**Packages** · Go · advanced

Write a package named `mathx`. Export `Max(nums ...int) (int, error)`, which returns `ErrEmpty` when called with no numbers, and `Clamp(v, lo, hi int) int`. Keep any helper you write unexported (lowercase), so other packages cannot call it.

Edit `solution.go`, then commit and push. Your tests run automatically.
