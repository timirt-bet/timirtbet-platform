# Bank account methods

**Methods** · Go · advanced

Define `type Account struct { Owner string; balance int }`. Add pointer-receiver methods `Deposit(n int)` (ignore amounts ≤ 0) and `Withdraw(n int) bool` (false and no change if funds are short), and a value-receiver method `Balance() int`.

Edit `solution.go`, then commit and push. Your tests run automatically.
