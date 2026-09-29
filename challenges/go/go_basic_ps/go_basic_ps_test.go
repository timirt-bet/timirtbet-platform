package exercise

import "testing"

func TestIsPalindrome(t *testing.T) {
	cases := map[string]bool{
		"Racecar":                        true,
		"A man, a plan, a canal: Panama": true,
		"Addis":                          false,
		"ሰላላሰ":                           true,
		"ሰላም":                            false,
		"":                               true,
	}
	for in, want := range cases {
		if got := IsPalindrome(in); got != want {
			t.Errorf("IsPalindrome(%q) = %v, want %v", in, got, want)
		}
	}
}
