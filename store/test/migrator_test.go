package test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestGetCurrentSchemaVersion(t *testing.T) {
	ctx := context.Background()
	ts := NewTestingStore(ctx, t)
	t.Cleanup(func() {
		require.NoError(t, ts.Close())
	})

	currentSchemaVersion, err := ts.GetCurrentSchemaVersion()
	require.NoError(t, err)
	require.Equal(t, "0.25.1", currentSchemaVersion)
}
