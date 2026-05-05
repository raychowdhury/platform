// KEK providers decouple how the master key reaches the process from how the
// crypter uses it. Static is the current dev path (decoded from env).
// HTTPProvider fetches the raw 32 bytes from a URL — works for sidecar
// patterns (Vault Agent, GCP Secret Manager via metadata server, AWS KMS via
// a thin /decrypt proxy). A real KMSProvider can implement the same
// interface and call the cloud SDK directly.
package crypter

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

type KEKProvider interface {
	// Key returns exactly 32 raw bytes (AES-256). Implementations should
	// cache where possible — the crypter calls Key once at construction.
	Key(ctx context.Context) ([]byte, error)
}

// StaticProvider holds a key already decoded from env.
type StaticProvider struct{ K []byte }

func (s *StaticProvider) Key(_ context.Context) ([]byte, error) {
	if len(s.K) != 32 {
		return nil, errors.New("static provider: key must be 32 bytes")
	}
	return s.K, nil
}

// HTTPProvider fetches the key from a URL on first use and caches the result.
// Response body is treated as raw bytes (no encoding) — keep the upstream
// service trustworthy and the channel encrypted (TLS or unix socket).
type HTTPProvider struct {
	URL     string
	Timeout time.Duration
	Header  http.Header // optional auth headers (e.g. Vault token)

	once sync.Once
	key  []byte
	err  error
}

func (h *HTTPProvider) Key(ctx context.Context) ([]byte, error) {
	h.once.Do(func() {
		timeout := h.Timeout
		if timeout == 0 {
			timeout = 5 * time.Second
		}
		fetchCtx, cancel := context.WithTimeout(ctx, timeout)
		defer cancel()
		req, err := http.NewRequestWithContext(fetchCtx, http.MethodGet, h.URL, nil)
		if err != nil {
			h.err = err
			return
		}
		for k, vs := range h.Header {
			for _, v := range vs {
				req.Header.Add(k, v)
			}
		}
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			h.err = err
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode/100 != 2 {
			h.err = fmt.Errorf("kek fetch: %s", resp.Status)
			return
		}
		b, err := io.ReadAll(io.LimitReader(resp.Body, 64))
		if err != nil {
			h.err = err
			return
		}
		if len(b) != 32 {
			h.err = fmt.Errorf("kek body must be 32 bytes, got %d", len(b))
			return
		}
		h.key = b
	})
	return h.key, h.err
}
