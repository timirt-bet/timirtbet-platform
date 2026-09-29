# A safe counter

**Synchronization** · Go · advanced

Build `SafeCounter`, a map of counts that many goroutines can use at once. Write `NewSafeCounter() *SafeCounter`, `Inc(key string)` and `Value(key string) int`, protecting the map with a `sync.Mutex`.

Edit `solution.go`, then commit and push. Your tests run automatically.
