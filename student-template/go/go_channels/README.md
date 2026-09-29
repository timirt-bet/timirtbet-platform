# Generator and sum

**Channels** · Go · advanced

Write `Generate(n int) <-chan int` that starts a goroutine sending 1, 2, … n on a channel and then closes it. Write `Sum(ch <-chan int) int` that ranges over the channel until it is closed and returns the total.

Edit `solution.go`, then commit and push. Your tests run automatically.
