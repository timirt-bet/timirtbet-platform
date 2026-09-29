# Shapes behind an interface

**Interfaces** · Go · advanced

Define `type Shape interface { Area() float64; Name() string }`, and two types that satisfy it: `Rect{W, H float64}` (name "rect") and `Circle{R float64}` (name "circle"). Write `TotalArea(shapes []Shape) float64` and `Largest(shapes []Shape) string` that returns the name of the biggest shape ("" for none).

Edit `solution.go`, then commit and push. Your tests run automatically.
