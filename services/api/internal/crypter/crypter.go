// Package crypter provides envelope encryption for at-rest secrets that the
// API needs to read in cleartext at runtime (TOTP seeds today, future Stripe
// keys, etc.). The KEK is supplied via env (TOTP_KEK = 32 bytes base64);
// production deployments should source it from a real KMS instead.
//
// Wire format: "enc:v1:" + base64url(nonce(12) || ciphertext+tag).
// Decrypt is tolerant of plaintext input — values that lack the prefix are
// returned unchanged so a deploy that flips encryption on doesn't break
// existing rows.
package crypter

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"strings"
)

const Prefix = "enc:v1:"

type Crypter struct{ aead cipher.AEAD }

// New returns a crypter using AES-256-GCM. key must be exactly 32 bytes; an
// empty key disables encryption — callers should branch on c == nil.
func New(key []byte) (*Crypter, error) {
	if len(key) == 0 {
		return nil, nil
	}
	if len(key) != 32 {
		return nil, errors.New("crypter key must be 32 bytes (AES-256-GCM)")
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &Crypter{aead: aead}, nil
}

func (c *Crypter) Encrypt(plain string) (string, error) {
	if c == nil {
		return plain, nil
	}
	nonce := make([]byte, c.aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return "", err
	}
	ct := c.aead.Seal(nil, nonce, []byte(plain), nil)
	return Prefix + base64.RawURLEncoding.EncodeToString(append(nonce, ct...)), nil
}

func (c *Crypter) Decrypt(stored string) (string, error) {
	if !strings.HasPrefix(stored, Prefix) {
		return stored, nil // plaintext / legacy
	}
	if c == nil {
		return "", errors.New("encrypted value but crypter not configured")
	}
	raw, err := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(stored, Prefix))
	if err != nil {
		return "", err
	}
	ns := c.aead.NonceSize()
	if len(raw) < ns {
		return "", errors.New("ciphertext too short")
	}
	pt, err := c.aead.Open(nil, raw[:ns], raw[ns:], nil)
	if err != nil {
		return "", err
	}
	return string(pt), nil
}
