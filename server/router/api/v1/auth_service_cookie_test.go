package v1

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
	"google.golang.org/grpc/metadata"
)

func TestIsSecureRequest(t *testing.T) {
	tests := []struct {
		name   string
		values map[string]string
		want   bool
	}{
		{name: "no metadata"},
		{name: "forwarded proto", values: map[string]string{"x-forwarded-proto": "http, https"}, want: true},
		{name: "standard forwarded header", values: map[string]string{"forwarded": "for=192.0.2.1; proto=https; host=example.com"}, want: true},
		{name: "later forwarded entry", values: map[string]string{"forwarded": "for=192.0.2.1;proto=http, for=192.0.2.2;proto=https"}, want: true},
		{name: "https origin", values: map[string]string{"origin": "HTTPS://example.com"}, want: true},
		{name: "plain http", values: map[string]string{"x-forwarded-proto": "http", "origin": "http://example.com"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			if tt.values != nil {
				md := metadata.MD{}
				for key, value := range tt.values {
					md.Set(key, value)
				}
				ctx = metadata.NewIncomingContext(ctx, md)
			}
			require.Equal(t, tt.want, isSecureRequest(ctx))
		})
	}
}

func TestBuildRefreshTokenCookieSecureAttribute(t *testing.T) {
	service := &APIV1Service{}
	expiresAt := time.Date(2030, time.January, 2, 3, 4, 5, 0, time.UTC)

	secureCtx := metadata.NewIncomingContext(context.Background(), metadata.Pairs("x-forwarded-proto", "https"))
	secureCookie := service.buildRefreshTokenCookie(secureCtx, "token", expiresAt)
	require.Contains(t, secureCookie, "; HttpOnly")
	require.Contains(t, secureCookie, "; SameSite=Lax")
	require.Contains(t, secureCookie, "; Secure")

	insecureCookie := service.buildRefreshTokenCookie(context.Background(), "token", expiresAt)
	require.NotContains(t, insecureCookie, "; Secure")
	require.False(t, strings.Contains(insecureCookie, "SameSite=None"))
}
