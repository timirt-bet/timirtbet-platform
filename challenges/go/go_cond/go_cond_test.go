package exercise

import "testing"

func TestGrade(t *testing.T) {
	cases := map[int]string{95: "A", 90: "A", 100: "A", 85: "B", 72: "C", 60: "D", 59: "F", 0: "F", -5: "invalid", 101: "invalid"}
	for in, want := range cases {
		if got := Grade(in); got != want {
			t.Errorf("Grade(%d) = %q, want %q", in, got, want)
		}
	}
}
