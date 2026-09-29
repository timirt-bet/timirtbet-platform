package exercise

type SafeCounter struct {
	// your fields here
}

func NewSafeCounter() *SafeCounter {
	// your code here
	return nil
}

func (c *SafeCounter) Inc(key string) {
	// your code here
}

func (c *SafeCounter) Value(key string) int {
	// your code here
	return 0
}
