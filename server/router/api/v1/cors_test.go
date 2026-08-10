package v1

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/usememos/memos/internal/profile"
)

func TestIsAllowedCORSOrigin(t *testing.T) {
	production := &profile.Profile{Mode: "prod", InstanceURL: "https://memos.example.com/app"}
	require.True(t, isAllowedCORSOrigin(production, "https://memos.example.com"))
	require.False(t, isAllowedCORSOrigin(production, "http://memos.example.com"))
	require.False(t, isAllowedCORSOrigin(production, "https://memos.example.com.evil.test"))
	require.False(t, isAllowedCORSOrigin(production, "https://evil.test"))
	require.False(t, isAllowedCORSOrigin(production, "not-an-origin"))

	productionWithoutURL := &profile.Profile{Mode: "prod"}
	require.False(t, isAllowedCORSOrigin(productionWithoutURL, "https://memos.example.com"))

	development := &profile.Profile{Mode: "dev"}
	require.True(t, isAllowedCORSOrigin(development, "http://localhost:3000"))
	require.True(t, isAllowedCORSOrigin(development, "http://127.0.0.1:3000"))
	require.True(t, isAllowedCORSOrigin(development, "https://[::1]:3000"))
	require.False(t, isAllowedCORSOrigin(development, "https://evil.test"))
	require.False(t, isAllowedCORSOrigin(development, "http://localhost.evil.test"))
}
