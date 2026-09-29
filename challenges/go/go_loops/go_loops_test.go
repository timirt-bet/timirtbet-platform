package exercise

import "testing"

func TestSumTo(t *testing.T) {
	for in, want := range map[int]int{0: 0, 1: 1, 5: 15, 100: 5050} {
		if got := SumTo(in); got != want {
			t.Errorf("SumTo(%d) = %d, want %d", in, got, want)
		}
	}
}

func TestCountDigits(t *testing.T) {
	for in, want := range map[int]int{0: 1, 7: 1, 42: 2, 2026: 4, -315: 3} {
		if got := CountDigits(in); got != want {
			t.Errorf("CountDigits(%d) = %d, want %d", in, got, want)
		}
	}
}
