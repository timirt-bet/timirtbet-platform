package exercise

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
