package exercise

import (
	"testing"
	"time"
)

func TestGenerateSum(t *testing.T) {
	done := make(chan int)
	go func() { done <- Sum(Generate(100)) }()
	select {
	case got := <-done:
		if got != 5050 {
			t.Errorf("Sum(Generate(100)) = %d, want 5050", got)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out: is the channel closed after the last value?")
	}
}

func TestGenerateOrder(t *testing.T) {
	got := make(chan []int)
	go func() {
		var vals []int
		for v := range Generate(5) {
			vals = append(vals, v)
		}
		got <- vals
	}()
	select {
	case vals := <-got:
		for i, v := range vals {
			if v != i+1 {
				t.Fatalf("value %d = %d, want %d", i, v, i+1)
			}
		}
		if len(vals) != 5 {
			t.Errorf("received %d values, want 5", len(vals))
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out: Generate must return a channel that is closed after the last value")
	}
}
