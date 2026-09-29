// Go exercise bank. Each exercise: starter/solution (full file) + real _test.go.
// `checks` are the in-browser structure checks (regex source strings).
const sig = (re, n) => ({ n, re });
export const GO = [
{
  id: "go-vars", lang: "go", level: "basic", topic: "Variables & Types", title: "Temperatures and cents", pkg: "exercise",
  prompt: "Write `Fahrenheit(c float64) float64` that converts Celsius to Fahrenheit (F = C × 9/5 + 32), and `Cents(birr float64) int` that converts an amount in birr to a whole number of santim (cents), rounding to the nearest one.",
  starter: `package exercise

func Fahrenheit(c float64) float64 {
	// your code here
	return 0
}

func Cents(birr float64) int {
	// your code here
	return 0
}
`,
  test: `package exercise

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
`,
  checks: [sig("func\\s+Fahrenheit\\s*\\(\\s*\\w+\\s+float64\\s*\\)\\s*float64", "Fahrenheit(c float64) float64 is declared"), sig("func\\s+Cents\\s*\\(\\s*\\w+\\s+float64\\s*\\)\\s*int\\b", "Cents(birr float64) int is declared"), sig("\\bint\\s*\\(", "converts float64 to int explicitly")],
},
{
  id: "go-cond", lang: "go", level: "basic", topic: "Conditions", title: "Letter grades", pkg: "exercise",
  prompt: "Write `Grade(score int) string`. Return \"A\" for 90 and above, \"B\" for 80–89, \"C\" for 70–79, \"D\" for 60–69, \"F\" below 60, and \"invalid\" for scores below 0 or above 100. Try a `switch` with no condition.",
  starter: `package exercise

func Grade(score int) string {
	// your code here
	return ""
}
`,
  test: `package exercise

import "testing"

func TestGrade(t *testing.T) {
	cases := map[int]string{95: "A", 90: "A", 100: "A", 85: "B", 72: "C", 60: "D", 59: "F", 0: "F", -5: "invalid", 101: "invalid"}
	for in, want := range cases {
		if got := Grade(in); got != want {
			t.Errorf("Grade(%d) = %q, want %q", in, got, want)
		}
	}
}
`,
  checks: [sig("func\\s+Grade\\s*\\(\\s*\\w+\\s+int\\s*\\)\\s*string", "Grade(score int) string is declared"), sig("\\b(if|switch)\\b", "uses if or switch")],
},
{
  id: "go-loops", lang: "go", level: "basic", topic: "Loops", title: "Sum with a loop", pkg: "exercise",
  prompt: "Write `SumTo(n int) int` that adds every whole number from 1 to `n` with a `for` loop, and `CountDigits(n int) int` that returns how many digits `n` has (0 has one digit; ignore the sign).",
  starter: `package exercise

func SumTo(n int) int {
	// your code here
	return 0
}

func CountDigits(n int) int {
	// your code here
	return 0
}
`,
  test: `package exercise

import "testing"

func TestSumTo(t *testing.T) {
	for in, want := range map[int]int{0: 0, 1: 1, 5: 15, 100: 5050} {
		if got := SumTo(in); got != want {
			t.Errorf("SumTo(%d) = %d, want %d", in, got, want)
		}
	}
}

func TestCountDigits(t *testing.T) {
	for in, want := range map[int]int{0: 1, 7: 1, 42: 2, 2026: 4, -315: 3} {
		if got := CountDigits(in); got != want {
			t.Errorf("CountDigits(%d) = %d, want %d", in, got, want)
		}
	}
}
`,
  checks: [sig("func\\s+SumTo\\s*\\(\\s*\\w+\\s+int\\s*\\)\\s*int", "SumTo(n int) int is declared"), sig("func\\s+CountDigits\\s*\\(\\s*\\w+\\s+int\\s*\\)\\s*int", "CountDigits(n int) int is declared"), sig("\\bfor\\b", "uses a for loop")],
},
{
  id: "go-func", lang: "go", level: "basic", topic: "Functions", title: "Multiple returns and function values", pkg: "exercise",
  prompt: "Write `Divmod(a, b int) (int, int)` that returns the quotient and remainder, and `Apply(nums []int, f func(int) int) []int` that returns a new slice with `f` applied to every element.",
  starter: `package exercise

func Divmod(a, b int) (int, int) {
	// your code here
	return 0, 0
}

func Apply(nums []int, f func(int) int) []int {
	// your code here
	return nil
}
`,
  test: `package exercise

import (
	"reflect"
	"testing"
)

func TestDivmod(t *testing.T) {
	q, r := Divmod(17, 5)
	if q != 3 || r != 2 {
		t.Errorf("Divmod(17, 5) = %d, %d, want 3, 2", q, r)
	}
}

func TestApply(t *testing.T) {
	double := func(n int) int { return n * 2 }
	if got := Apply([]int{1, 2, 3}, double); !reflect.DeepEqual(got, []int{2, 4, 6}) {
		t.Errorf("Apply(double) = %v, want [2 4 6]", got)
	}
	if got := Apply([]int{}, double); len(got) != 0 {
		t.Errorf("Apply on empty slice = %v, want empty", got)
	}
}
`,
  checks: [sig("func\\s+Divmod\\s*\\(\\s*\\w+\\s*,\\s*\\w+\\s+int\\s*\\)\\s*\\(\\s*(\\w+\\s*,\\s*\\w+\\s+int|int\\s*,\\s*int)\\s*\\)", "Divmod(a, b int) returns two ints"), sig("func\\s+Apply\\s*\\(\\s*\\w+\\s+\\[\\]int\\s*,\\s*\\w+\\s+func\\s*\\(\\s*int\\s*\\)\\s*int\\s*\\)\\s*\\[\\]int", "Apply takes a func(int) int")],
},
{
  id: "go-slices", lang: "go", level: "basic", topic: "Slices", title: "Average and reverse", pkg: "exercise",
  prompt: "Write `Average(nums []float64) float64` (0 for an empty slice) and `Reverse(s []int) []int` that returns a new reversed slice without changing the input.",
  starter: `package exercise

func Average(nums []float64) float64 {
	// your code here
	return 0
}

func Reverse(s []int) []int {
	// your code here
	return nil
}
`,
  test: `package exercise

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
`,
  checks: [sig("func\\s+Average\\s*\\(\\s*\\w+\\s+\\[\\]float64\\s*\\)\\s*float64", "Average(nums []float64) float64 is declared"), sig("func\\s+Reverse\\s*\\(\\s*\\w+\\s+\\[\\]int\\s*\\)\\s*\\[\\]int", "Reverse(s []int) []int is declared"), sig("\\blen\\s*\\(", "uses len()"), sig("\\b(make|append)\\s*\\(", "builds a new slice with make or append")],
},
{
  id: "go-maps", lang: "go", level: "basic", topic: "Maps", title: "Count the words", pkg: "exercise",
  prompt: "Write `CountWords(s string) map[string]int` that maps each lowercase word to how many times it appears. Words are separated by whitespace; `strings.Fields` and `strings.ToLower` help.",
  starter: `package exercise

func CountWords(s string) map[string]int {
	// your code here
	return nil
}
`,
  test: `package exercise

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
`,
  checks: [sig("func\\s+CountWords\\s*\\(\\s*\\w+\\s+string\\s*\\)\\s*map\\[string\\]int", "CountWords(s string) map[string]int is declared"), sig("make\\s*\\(\\s*map\\[string\\]int|map\\[string\\]int\\s*\\{\\s*\\}", "creates the map before writing to it"), sig("\"strings\"", "imports the strings package")],
},
{
  id: "go-structs", lang: "go", level: "basic", topic: "Structs", title: "Best student", pkg: "exercise",
  prompt: "Define `type Student struct { Name string; Scores []int }`. Write `BestStudent(students []Student) (string, bool)` that returns the name with the highest average score and true, or \"\" and false for an empty slice. If two averages tie, keep the first student.",
  starter: `package exercise

type Student struct {
	// your fields here
}

func BestStudent(students []Student) (string, bool) {
	// your code here
	return "", false
}
`,
  test: `package exercise

import "testing"

func TestBestStudent(t *testing.T) {
	class := []Student{
		{Name: "Abel", Scores: []int{70, 80}},
		{Name: "Sara", Scores: []int{90, 95}},
		{Name: "Liya", Scores: []int{88, 97}},
	}
	if name, ok := BestStudent(class); !ok || name != "Sara" {
		t.Errorf("BestStudent = %q, %v, want \\"Sara\\", true", name, ok)
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
		t.Errorf("BestStudent(nil) = %q, %v, want \\"\\", false", name, ok)
	}
}
`,
  checks: [sig("type\\s+Student\\s+struct\\s*\\{[^}]*\\bName\\s+string[^}]*\\bScores\\s+\\[\\]int", "Student has Name string and Scores []int"), sig("func\\s+BestStudent\\s*\\(\\s*\\w+\\s+\\[\\]Student\\s*\\)\\s*\\(\\s*string\\s*,\\s*bool\\s*\\)", "BestStudent returns (string, bool)")],
},
{
  id: "go-basic-ps", lang: "go", level: "basic", topic: "Basic problem solving", title: "Palindromes in any script", pkg: "exercise",
  prompt: "Write `IsPalindrome(s string) bool` that ignores case and anything that is not a letter or digit. Work with runes, not bytes, so Ge'ez script works too: \"ሰላላሰ\" is a palindrome.",
  starter: `package exercise

func IsPalindrome(s string) bool {
	// your code here
	return false
}
`,
  test: `package exercise

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
`,
  checks: [sig("func\\s+IsPalindrome\\s*\\(\\s*\\w+\\s+string\\s*\\)\\s*bool", "IsPalindrome(s string) bool is declared"), sig("\\brune\\b|\\[\\]rune|unicode\\.", "works with runes or the unicode package")],
},
{
  id: "go-pointers", lang: "go", level: "advanced", topic: "Pointers", title: "Swap and double", pkg: "exercise",
  prompt: "Write `Swap(a, b *int)` that swaps the values the pointers point to, and `Double(p *int)` that doubles the value in place. `Double(nil)` must do nothing instead of panicking.",
  starter: `package exercise

func Swap(a, b *int) {
	// your code here
}

func Double(p *int) {
	// your code here
}
`,
  test: `package exercise

import "testing"

func TestSwap(t *testing.T) {
	x, y := 1, 2
	Swap(&x, &y)
	if x != 2 || y != 1 {
		t.Errorf("after Swap: x=%d y=%d, want x=2 y=1", x, y)
	}
}

func TestDouble(t *testing.T) {
	n := 21
	Double(&n)
	if n != 42 {
		t.Errorf("after Double: n=%d, want 42", n)
	}
}

func TestDoubleNil(t *testing.T) {
	defer func() {
		if r := recover(); r != nil {
			t.Errorf("Double(nil) panicked: %v", r)
		}
	}()
	Double(nil)
}
`,
  checks: [sig("func\\s+Swap\\s*\\(\\s*\\w+\\s*,\\s*\\w+\\s+\\*int\\s*\\)", "Swap(a, b *int) is declared"), sig("func\\s+Double\\s*\\(\\s*\\w+\\s+\\*int\\s*\\)", "Double(p *int) is declared"), sig("\\*\\w+\\s*(,|\\*=|=)", "dereferences a pointer"), sig("==\\s*nil|nil\\s*==|!=\\s*nil", "checks for nil")],
},
{
  id: "go-methods", lang: "go", level: "advanced", topic: "Methods", title: "Bank account methods", pkg: "exercise",
  prompt: "Define `type Account struct { Owner string; balance int }`. Add pointer-receiver methods `Deposit(n int)` (ignore amounts ≤ 0) and `Withdraw(n int) bool` (false and no change if funds are short), and a value-receiver method `Balance() int`.",
  starter: `package exercise

type Account struct {
	Owner   string
	balance int
}

func (a *Account) Deposit(n int) {
	// your code here
}

func (a *Account) Withdraw(n int) bool {
	// your code here
	return false
}

func (a Account) Balance() int {
	// your code here
	return 0
}
`,
  test: `package exercise

import "testing"

func TestAccount(t *testing.T) {
	acc := &Account{Owner: "Hana"}
	acc.Deposit(100)
	acc.Deposit(-50)
	if !acc.Withdraw(30) {
		t.Fatal("Withdraw(30) = false, want true")
	}
	if acc.Withdraw(500) {
		t.Error("Withdraw(500) = true with only 70 in the account")
	}
	if got := acc.Balance(); got != 70 {
		t.Errorf("Balance() = %d, want 70", got)
	}
}
`,
  checks: [sig("func\\s*\\(\\s*\\w+\\s+\\*Account\\s*\\)\\s*Deposit\\s*\\(\\s*\\w+\\s+int\\s*\\)", "Deposit has a pointer receiver"), sig("func\\s*\\(\\s*\\w+\\s+\\*Account\\s*\\)\\s*Withdraw\\s*\\(\\s*\\w+\\s+int\\s*\\)\\s*bool", "Withdraw has a pointer receiver and returns bool"), sig("func\\s*\\(\\s*\\w+\\s+\\*?Account\\s*\\)\\s*Balance\\s*\\(\\s*\\)\\s*int", "Balance() int is declared")],
},
{
  id: "go-interfaces", lang: "go", level: "advanced", topic: "Interfaces", title: "Shapes behind an interface", pkg: "exercise",
  prompt: "Define `type Shape interface { Area() float64; Name() string }`, and two types that satisfy it: `Rect{W, H float64}` (name \"rect\") and `Circle{R float64}` (name \"circle\"). Write `TotalArea(shapes []Shape) float64` and `Largest(shapes []Shape) string` that returns the name of the biggest shape (\"\" for none).",
  starter: `package exercise

type Shape interface {
	// your methods here
}

type Rect struct {
	W, H float64
}

type Circle struct {
	R float64
}

func TotalArea(shapes []Shape) float64 {
	// your code here
	return 0
}

func Largest(shapes []Shape) string {
	// your code here
	return ""
}
`,
  test: `package exercise

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
		t.Errorf("Largest = %q, want \\"circle\\"", got)
	}
	if got := Largest(nil); got != "" {
		t.Errorf("Largest(nil) = %q, want \\"\\"", got)
	}
}
`,
  checks: [sig("type\\s+Shape\\s+interface\\s*\\{[^}]*Area\\s*\\(\\s*\\)\\s*float64[^}]*Name\\s*\\(\\s*\\)\\s*string|type\\s+Shape\\s+interface\\s*\\{[^}]*Name\\s*\\(\\s*\\)\\s*string[^}]*Area\\s*\\(\\s*\\)\\s*float64", "Shape declares Area() and Name()"), sig("func\\s*\\(\\s*\\w+\\s+\\*?Rect\\s*\\)\\s*Area", "Rect implements Area"), sig("func\\s*\\(\\s*\\w+\\s+\\*?Circle\\s*\\)\\s*Area", "Circle implements Area"), sig("func\\s+TotalArea\\s*\\(\\s*\\w+\\s+\\[\\]Shape\\s*\\)\\s*float64", "TotalArea takes []Shape")],
},
{
  id: "go-errors", lang: "go", level: "advanced", topic: "Errors", title: "Wrapped errors", pkg: "exercise",
  prompt: "Declare `var ErrInvalidAge = errors.New(\"invalid age\")`. Write `ParseAge(s string) (int, error)` that returns a whole number from 0 to 150. For anything else, return an error that wraps `ErrInvalidAge` with `fmt.Errorf` and `%w`, and includes the input, so `errors.Is(err, ErrInvalidAge)` is true.",
  starter: `package exercise

import "errors"

var ErrInvalidAge = errors.New("invalid age")

func ParseAge(s string) (int, error) {
	// your code here
	return 0, nil
}
`,
  test: `package exercise

import (
	"errors"
	"strings"
	"testing"
)

func TestParseAgeValid(t *testing.T) {
	n, err := ParseAge("17")
	if err != nil || n != 17 {
		t.Errorf("ParseAge(\\"17\\") = %d, %v, want 17, nil", n, err)
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
`,
  checks: [sig("func\\s+ParseAge\\s*\\(\\s*\\w+\\s+string\\s*\\)\\s*\\(\\s*int\\s*,\\s*error\\s*\\)", "ParseAge returns (int, error)"), sig("fmt\\.Errorf\\([^)]*%w", "wraps the error with %w"), sig("strconv\\.", "parses with strconv")],
},
{
  id: "go-packages", lang: "go", level: "advanced", topic: "Packages", title: "Your own package", pkg: "mathx",
  prompt: "Write a package named `mathx`. Export `Max(nums ...int) (int, error)`, which returns `ErrEmpty` when called with no numbers, and `Clamp(v, lo, hi int) int`. Keep any helper you write unexported (lowercase), so other packages cannot call it.",
  starter: `package mathx

import "errors"

var ErrEmpty = errors.New("mathx: no numbers")

func Max(nums ...int) (int, error) {
	// your code here
	return 0, nil
}

func Clamp(v, lo, hi int) int {
	// your code here
	return 0
}
`,
  test: `package mathx

import (
	"errors"
	"testing"
)

func TestMax(t *testing.T) {
	if got, err := Max(3, 9, 2); err != nil || got != 9 {
		t.Errorf("Max(3, 9, 2) = %d, %v, want 9, nil", got, err)
	}
	if got, _ := Max(-4, -7); got != -4 {
		t.Errorf("Max(-4, -7) = %d, want -4", got)
	}
	if _, err := Max(); !errors.Is(err, ErrEmpty) {
		t.Errorf("Max() error = %v, want ErrEmpty", err)
	}
}

func TestClamp(t *testing.T) {
	cases := []struct{ v, lo, hi, want int }{{5, 0, 10, 5}, {-3, 0, 10, 0}, {42, 0, 10, 10}}
	for _, c := range cases {
		if got := Clamp(c.v, c.lo, c.hi); got != c.want {
			t.Errorf("Clamp(%d, %d, %d) = %d, want %d", c.v, c.lo, c.hi, got, c.want)
		}
	}
}
`,
  checks: [sig("^\\s*package\\s+mathx\\b", "file declares package mathx"), sig("func\\s+Max\\s*\\(\\s*\\w+\\s*\\.\\.\\.int\\s*\\)\\s*\\(\\s*int\\s*,\\s*error\\s*\\)", "Max is variadic and returns (int, error)"), sig("func\\s+Clamp\\s*\\(", "Clamp is exported")],
},
{
  id: "go-goroutines", lang: "go", level: "advanced", topic: "Goroutines", title: "Square in parallel", pkg: "exercise",
  prompt: "Write `SquareAll(nums []int) []int` that squares every number in its own goroutine and waits for all of them with a `sync.WaitGroup`. The result must keep the input order. Each goroutine writes only to its own index, so no mutex is needed.",
  starter: `package exercise

func SquareAll(nums []int) []int {
	// your code here
	return nil
}
`,
  test: `package exercise

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
`,
  checks: [sig("func\\s+SquareAll\\s*\\(\\s*\\w+\\s+\\[\\]int\\s*\\)\\s*\\[\\]int", "SquareAll(nums []int) []int is declared"), sig("\\bgo\\s+(func\\b|\\w+\\()", "starts goroutines with go"), sig("sync\\.WaitGroup", "waits with a sync.WaitGroup"), sig("\\.Wait\\(\\)", "calls Wait()")],
},
{
  id: "go-channels", lang: "go", level: "advanced", topic: "Channels", title: "Generator and sum", pkg: "exercise",
  prompt: "Write `Generate(n int) <-chan int` that starts a goroutine sending 1, 2, … n on a channel and then closes it. Write `Sum(ch <-chan int) int` that ranges over the channel until it is closed and returns the total.",
  starter: `package exercise

func Generate(n int) <-chan int {
	// your code here
	return nil
}

func Sum(ch <-chan int) int {
	// your code here
	return 0
}
`,
  test: `package exercise

import (
	"testing"
	"time"
)

func TestGenerateSum(t *testing.T) {
	done := make(chan int)
	go func() { done <- Sum(Generate(100)) }()
	select {
	case got := <-done:
		if got != 5050 {
			t.Errorf("Sum(Generate(100)) = %d, want 5050", got)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out: is the channel closed after the last value?")
	}
}

func TestGenerateOrder(t *testing.T) {
	got := make(chan []int)
	go func() {
		var vals []int
		for v := range Generate(5) {
			vals = append(vals, v)
		}
		got <- vals
	}()
	select {
	case vals := <-got:
		for i, v := range vals {
			if v != i+1 {
				t.Fatalf("value %d = %d, want %d", i, v, i+1)
			}
		}
		if len(vals) != 5 {
			t.Errorf("received %d values, want 5", len(vals))
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out: Generate must return a channel that is closed after the last value")
	}
}
`,
  checks: [sig("func\\s+Generate\\s*\\(\\s*\\w+\\s+int\\s*\\)\\s*<-\\s*chan\\s+int", "Generate returns <-chan int"), sig("func\\s+Sum\\s*\\(\\s*\\w+\\s+<-\\s*chan\\s+int\\s*\\)\\s*int", "Sum takes <-chan int"), sig("make\\s*\\(\\s*chan\\b", "makes a channel"), sig("\\bclose\\s*\\(", "closes the channel"), sig("\\bgo\\s+func\\b|\\bgo\\s+\\w+\\(", "sends from a goroutine")],
},
{
  id: "go-sync", lang: "go", level: "advanced", topic: "Synchronization", title: "A safe counter", pkg: "exercise",
  prompt: "Build `SafeCounter`, a map of counts that many goroutines can use at once. Write `NewSafeCounter() *SafeCounter`, `Inc(key string)` and `Value(key string) int`, protecting the map with a `sync.Mutex`.",
  starter: `package exercise

type SafeCounter struct {
	// your fields here
}

func NewSafeCounter() *SafeCounter {
	// your code here
	return nil
}

func (c *SafeCounter) Inc(key string) {
	// your code here
}

func (c *SafeCounter) Value(key string) int {
	// your code here
	return 0
}
`,
  test: `package exercise

import (
	"sync"
	"testing"
)

func TestSafeCounter(t *testing.T) {
	c := NewSafeCounter()
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 10; j++ {
				c.Inc("visits")
			}
		}()
	}
	wg.Wait()
	if got := c.Value("visits"); got != 1000 {
		t.Errorf("Value(\\"visits\\") = %d, want 1000", got)
	}
	if got := c.Value("missing"); got != 0 {
		t.Errorf("Value(\\"missing\\") = %d, want 0", got)
	}
}
`,
  checks: [sig("sync\\.(RW)?Mutex", "uses a sync.Mutex"), sig("\\.Lock\\(\\)", "locks before touching the map"), sig("\\.Unlock\\(\\)", "unlocks (ideally with defer)"), sig("func\\s+NewSafeCounter\\s*\\(\\s*\\)\\s*\\*SafeCounter", "NewSafeCounter() *SafeCounter is declared"), sig("make\\s*\\(\\s*map\\[string\\]int|map\\[string\\]int\\s*\\{\\s*\\}", "initialises the map")],
},
{
  id: "go-adv-ps", lang: "go", level: "advanced", topic: "Advanced problem solving", title: "Top words", pkg: "exercise",
  prompt: "Write `TopWords(text string, n int) []string` that returns the `n` most frequent words. Words are runs of letters, compared in lowercase. Order by count (highest first), then alphabetically. If there are fewer than `n` different words, return them all.",
  starter: `package exercise

func TopWords(text string, n int) []string {
	// your code here
	return nil
}
`,
  test: `package exercise

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
`,
  checks: [sig("func\\s+TopWords\\s*\\(\\s*\\w+\\s+string\\s*,\\s*\\w+\\s+int\\s*\\)\\s*\\[\\]string", "TopWords(text string, n int) []string is declared"), sig("sort\\.|slices\\.Sort", "sorts the result"), sig("map\\[string\\]int", "counts with a map")],
},
];
