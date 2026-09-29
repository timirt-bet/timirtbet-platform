package exercise

import (
	"reflect"
	"testing"
)

func TestAverage(t *testing.T) {
	if got := Average([]float64{2, 4, 6}); got != 4 {
		t.Errorf("Average = %v, want 4", got)
	}
	if got := Average(nil); got != 0 {
		t.Errorf("Average(nil) = %v, want 0", got)
	}
}

func TestReverse(t *testing.T) {
	in := []int{1, 2, 3}
	got := Reverse(in)
	if !reflect.DeepEqual(got, []int{3, 2, 1}) {
		t.Errorf("Reverse = %v, want [3 2 1]", got)
	}
	if !reflect.DeepEqual(in, []int{1, 2, 3}) {
		t.Errorf("Reverse changed its input to %v", in)
	}
}
