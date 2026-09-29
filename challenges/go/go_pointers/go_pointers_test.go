package exercise

import "testing"

func TestSwap(t *testing.T) {
	x, y := 1, 2
	Swap(&x, &y)
	if x != 2 || y != 1 {
		t.Errorf("after Swap: x=%d y=%d, want x=2 y=1", x, y)
	}
}

func TestDouble(t *testing.T) {
	n := 21
	Double(&n)
	if n != 42 {
		t.Errorf("after Double: n=%d, want 42", n)
	}
}

func TestDoubleNil(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("Double(nil) panicked: %v", r)
		}
	}()
	Double(nil)
}
