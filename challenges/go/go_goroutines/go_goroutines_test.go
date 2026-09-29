package exercise

import (
	"reflect"
	"testing"
)

func TestSquareAll(t *testing.T) {
	if got := SquareAll([]int{1, 2, 3, 4}); !reflect.DeepEqual(got, []int{1, 4, 9, 16}) {
		t.Errorf("SquareAll = %v, want [1 4 9 16]", got)
	}
}

func TestSquareAllLarge(t *testing.T) {
	in := make([]int, 1000)
	for i := range in {
		in[i] = i
	}
	got := SquareAll(in)
	for i, v := range got {
		if v != i*i {
			t.Fatalf("SquareAll[%d] = %d, want %d", i, v, i*i)
		}
	}
}
