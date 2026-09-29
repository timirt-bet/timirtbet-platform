# Square in parallel

**Goroutines** · Go · advanced

Write `SquareAll(nums []int) []int` that squares every number in its own goroutine and waits for all of them with a `sync.WaitGroup`. The result must keep the input order. Each goroutine writes only to its own index, so no mutex is needed.

Edit `solution.go`, then commit and push. Your tests run automatically.
