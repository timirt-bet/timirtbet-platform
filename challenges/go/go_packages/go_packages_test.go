package mathx

import (
	"errors"
	"testing"
)

func TestMax(t *testing.T) {
	if got, err := Max(3, 9, 2); err != nil || got != 9 {
		t.Errorf("Max(3, 9, 2) = %d, %v, want 9, nil", got, err)
	}
	if got, _ := Max(-4, -7); got != -4 {
		t.Errorf("Max(-4, -7) = %d, want -4", got)
	}
	if _, err := Max(); !errors.Is(err, ErrEmpty) {
		t.Errorf("Max() error = %v, want ErrEmpty", err)
	}
}

func TestClamp(t *testing.T) {
	cases := []struct{ v, lo, hi, want int }{{5, 0, 10, 5}, {-3, 0, 10, 0}, {42, 0, 10, 10}}
	for _, c := range cases {
		if got := Clamp(c.v, c.lo, c.hi); got != c.want {
			t.Errorf("Clamp(%d, %d, %d) = %d, want %d", c.v, c.lo, c.hi, got, c.want)
		}
	}
}
