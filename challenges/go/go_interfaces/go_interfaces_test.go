package exercise

import (
	"math"
	"testing"
)

var _ Shape = Rect{}
var _ Shape = Circle{}

func TestTotalArea(t *testing.T) {
	got := TotalArea([]Shape{Rect{W: 2, H: 3}, Circle{R: 1}})
	if want := 6 + math.Pi; math.Abs(got-want) > 1e-9 {
		t.Errorf("TotalArea = %v, want %v", got, want)
	}
}

func TestLargest(t *testing.T) {
	if got := Largest([]Shape{Rect{W: 1, H: 1}, Circle{R: 2}, Rect{W: 3, H: 3}}); got != "circle" {
		t.Errorf("Largest = %q, want \"circle\"", got)
	}
	if got := Largest(nil); got != "" {
		t.Errorf("Largest(nil) = %q, want \"\"", got)
	}
}
