package postgres

import (
	"database/sql"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNormalizeMemoTimestamps(t *testing.T) {
	tests := []struct {
		name                    string
		createdTs, updatedTs    sql.NullInt64
		wantCreated, wantUpdate int64
	}{
		{
			name:        "both timestamps",
			createdTs:   sql.NullInt64{Int64: 100, Valid: true},
			updatedTs:   sql.NullInt64{Int64: 200, Valid: true},
			wantCreated: 100,
			wantUpdate:  200,
		},
		{
			name:        "missing update falls back to creation",
			createdTs:   sql.NullInt64{Int64: 100, Valid: true},
			wantCreated: 100,
			wantUpdate:  100,
		},
		{
			name:        "missing creation falls back to update",
			updatedTs:   sql.NullInt64{Int64: 200, Valid: true},
			wantCreated: 200,
			wantUpdate:  200,
		},
		{
			name: "both timestamps missing remain unknown",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			created, updated := normalizeMemoTimestamps(tt.createdTs, tt.updatedTs)
			require.Equal(t, tt.wantCreated, created)
			require.Equal(t, tt.wantUpdate, updated)
		})
	}
}
