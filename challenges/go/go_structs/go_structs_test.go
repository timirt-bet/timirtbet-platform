package exercise

import "testing"

func TestBestStudent(t *testing.T) {
	class := []Student{
		{Name: "Abel", Scores: []int{70, 80}},
		{Name: "Sara", Scores: []int{90, 95}},
		{Name: "Liya", Scores: []int{88, 97}},
	}
	if name, ok := BestStudent(class); !ok || name != "Sara" {
		t.Errorf("BestStudent = %q, %v, want \"Sara\", true", name, ok)
	}
}

func TestBestStudentTie(t *testing.T) {
	class := []Student{{Name: "Yonas", Scores: []int{80}}, {Name: "Bethel", Scores: []int{80}}}
	if name, _ := BestStudent(class); name != "Yonas" {
		t.Errorf("tie should keep the first student, got %q", name)
	}
}

func TestBestStudentEmpty(t *testing.T) {
	if name, ok := BestStudent(nil); ok || name != "" {
		t.Errorf("BestStudent(nil) = %q, %v, want \"\", false", name, ok)
	}
}
