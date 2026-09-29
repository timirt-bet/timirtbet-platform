package exercise

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
