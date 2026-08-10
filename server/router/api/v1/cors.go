package v1

import (
	"net"
	"net/http"
	"net/url"
	"strings"

	"github.com/labstack/echo/v4/middleware"

	"github.com/usememos/memos/internal/profile"
)

func newCORSConfig(profile *profile.Profile) middleware.CORSConfig {
	return middleware.CORSConfig{
		AllowOriginFunc: func(origin string) (bool, error) {
			return isAllowedCORSOrigin(profile, origin), nil
		},
		AllowMethods: []string{
			http.MethodGet,
			http.MethodHead,
			http.MethodPost,
			http.MethodPut,
			http.MethodPatch,
			http.MethodDelete,
			http.MethodOptions,
		},
		AllowHeaders:     []string{"*"},
		AllowCredentials: true,
	}
}

func isAllowedCORSOrigin(profile *profile.Profile, origin string) bool {
	originURL, ok := parseCORSOrigin(origin, false)
	if !ok {
		return false
	}

	if profile.InstanceURL != "" {
		instanceURL, valid := parseCORSOrigin(profile.InstanceURL, true)
		if valid && sameCORSOrigin(originURL, instanceURL) {
			return true
		}
	}

	if !profile.IsDev() {
		return false
	}

	hostname := strings.ToLower(originURL.Hostname())
	if hostname == "localhost" {
		return true
	}
	ip := net.ParseIP(hostname)
	return ip != nil && ip.IsLoopback()
}

func parseCORSOrigin(raw string, allowPath bool) (*url.URL, bool) {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return nil, false
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return nil, false
	}
	if !allowPath && parsed.Path != "" && parsed.Path != "/" {
		return nil, false
	}
	return parsed, true
}

func sameCORSOrigin(left, right *url.URL) bool {
	return strings.EqualFold(left.Scheme, right.Scheme) && strings.EqualFold(left.Host, right.Host)
}
