package postgres

import (
	"strings"
	"testing"
)

func TestQuoteIdent(t *testing.T) {
	tests := []struct {
		name string
		want string
	}{
		{name: "idp", want: `"idp"`},
		{name: "user", want: `"user"`},
		{name: `weird"name`, want: `"weird""name"`},
	}
	for _, tt := range tests {
		if got := quoteIdent(tt.name); got != tt.want {
			t.Errorf("quoteIdent(%q) = %s, want %s", tt.name, got, tt.want)
		}
	}
}

func TestNextIDExpr(t *testing.T) {
	got := nextIDExpr("idp")
	for _, wantSub := range []string{`pg_get_serial_sequence('"idp"', 'id')`, `FROM "idp"`} {
		if !strings.Contains(got, wantSub) {
			t.Errorf("nextIDExpr(idp) missing %s: %s", wantSub, got)
		}
	}

	got = nextIDExpr("user")
	for _, wantSub := range []string{`pg_get_serial_sequence('"user"', 'id')`, `FROM "user"`} {
		if !strings.Contains(got, wantSub) {
			t.Errorf("nextIDExpr(user) missing %s: %s", wantSub, got)
		}
	}
}
