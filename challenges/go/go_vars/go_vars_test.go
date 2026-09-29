package exercise

import "testing"

func TestFahrenheit(t *testing.T) {
	cases := []struct{ in, want float64 }{{100, 212}, {0, 32}, {-40, -40}, {37, 98.6}}
	for _, c := range cases {
		if got := Fahrenheit(c.in); got < c.want-1e-9 || got > c.want+1e-9 {
			t.Errorf("Fahrenheit(%v) = %v, want %v", c.in, got, c.want)
		}
	}
}

func TestCents(t *testing.T) {
	cases := []struct {
		in   float64
		want int
	}{{12.5, 1250}, {0.1, 10}, {19.99, 1999}, {0, 0}}
	for _, c := range cases {
		if got := Cents(c.in); got != c.want {
			t.Errorf("Cents(%v) = %d, want %d", c.in, got, c.want)
		}
	}
}
