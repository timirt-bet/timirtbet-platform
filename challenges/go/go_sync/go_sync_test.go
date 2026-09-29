package exercise

import (
	"sync"
	"testing"
)

func TestSafeCounter(t *testing.T) {
	c := NewSafeCounter()
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 10; j++ {
				c.Inc("visits")
			}
		}()
	}
	wg.Wait()
	if got := c.Value("visits"); got != 1000 {
		t.Errorf("Value(\"visits\") = %d, want 1000", got)
	}
	if got := c.Value("missing"); got != 0 {
		t.Errorf("Value(\"missing\") = %d, want 0", got)
	}
}
