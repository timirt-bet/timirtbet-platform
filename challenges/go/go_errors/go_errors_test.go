package exercise

import (
	"errors"
	"strings"
	"testing"
)

func TestParseAgeValid(t *testing.T) {
	n, err := ParseAge("17")
	if err != nil || n != 17 {
		t.Errorf("ParseAge(\"17\") = %d, %v, want 17, nil", n, err)
	}
}

func TestParseAgeInvalid(t *testing.T) {
	for _, in := range []string{"abc", "-1", "200", "12.5", ""} {
		_, err := ParseAge(in)
		if !errors.Is(err, ErrInvalidAge) {
			t.Errorf("ParseAge(%q) error = %v, want it to wrap ErrInvalidAge", in, err)
			continue
		}
		if in != "" && !strings.Contains(err.Error(), in) {
			t.Errorf("error %q should mention the input %q", err, in)
		}
	}
}
