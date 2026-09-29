package exercise

import (
	"reflect"
	"testing"
)

func TestTopWords(t *testing.T) {
	text := "Coffee, coffee and bread. Bread and COFFEE! Tea?"
	if got := TopWords(text, 2); !reflect.DeepEqual(got, []string{"coffee", "and"}) {
		t.Errorf("TopWords(2) = %v, want [coffee and]", got)
	}
}

func TestTopWordsAll(t *testing.T) {
	if got := TopWords("b a b", 10); !reflect.DeepEqual(got, []string{"b", "a"}) {
		t.Errorf("TopWords(10) = %v, want [b a]", got)
	}
	if got := TopWords("", 3); len(got) != 0 {
		t.Errorf("TopWords on empty text = %v, want empty", got)
	}
}
