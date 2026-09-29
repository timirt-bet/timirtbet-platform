package exercise

import (
	"reflect"
	"testing"
)

func TestCountWords(t *testing.T) {
	got := CountWords("the cat  The dog")
	want := map[string]int{"the": 2, "cat": 1, "dog": 1}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("CountWords = %v, want %v", got, want)
	}
}

func TestCountWordsEmpty(t *testing.T) {
	got := CountWords("   ")
	if got == nil || len(got) != 0 {
		t.Errorf("CountWords on blank input = %#v, want an empty, non-nil map", got)
	}
}
