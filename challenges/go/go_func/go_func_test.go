package exercise

import (
	"reflect"
	"testing"
)

func TestDivmod(t *testing.T) {
	q, r := Divmod(17, 5)
	if q != 3 || r != 2 {
		t.Errorf("Divmod(17, 5) = %d, %d, want 3, 2", q, r)
	}
}

func TestApply(t *testing.T) {
	double := func(n int) int { return n * 2 }
	if got := Apply([]int{1, 2, 3}, double); !reflect.DeepEqual(got, []int{2, 4, 6}) {
		t.Errorf("Apply(double) = %v, want [2 4 6]", got)
	}
	if got := Apply([]int{}, double); len(got) != 0 {
		t.Errorf("Apply on empty slice = %v, want empty", got)
	}
}
