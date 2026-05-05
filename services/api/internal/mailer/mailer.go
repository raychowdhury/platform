// Package mailer is a thin transactional-email indirection. The default driver
// (Console) logs each message to stdout, which is sufficient for the
// paper-trading dev environment and for smoke tests; SMTP is used when
// SMTP_ADDR is configured. Templates are tiny inline strings — bringing in a
// templating library is overkill until product copy churn warrants it.
package mailer

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/smtp"
	"strings"
)

type Message struct {
	To      string
	Subject string
	Body    string // plain text only for now
}

type Mailer interface {
	Send(ctx context.Context, m Message) error
}

// Console writes each message to the structured logger. We tag it with
// kind=email so test harnesses can grep for it.
type Console struct{ Log *slog.Logger }

func (c *Console) Send(_ context.Context, m Message) error {
	c.Log.Info("email", "to", m.To, "subject", m.Subject, "body", m.Body)
	return nil
}

type SMTP struct {
	Addr     string // host:port
	Username string
	Password string
	From     string
}

func (s *SMTP) Send(_ context.Context, m Message) error {
	if s.Addr == "" || s.From == "" {
		return errors.New("smtp not configured")
	}
	host := s.Addr
	if i := strings.IndexByte(host, ':'); i >= 0 {
		host = host[:i]
	}
	auth := smtp.PlainAuth("", s.Username, s.Password, host)
	msg := []byte(fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s\r\n",
		s.From, m.To, m.Subject, m.Body))
	return smtp.SendMail(s.Addr, auth, s.From, []string{m.To}, msg)
}

// New returns the SMTP driver if cfg.Addr is non-empty, otherwise Console.
// Auth flows call Send synchronously today; if delivery latency starts to
// matter, wrap in a buffered goroutine — single-tenant volume doesn't need it.
func New(log *slog.Logger, smtpAddr, smtpUser, smtpPass, from string) Mailer {
	if smtpAddr != "" && from != "" {
		return &SMTP{Addr: smtpAddr, Username: smtpUser, Password: smtpPass, From: from}
	}
	return &Console{Log: log}
}
