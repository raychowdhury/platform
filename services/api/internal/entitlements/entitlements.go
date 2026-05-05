// Package entitlements exposes plan-derived limits to feature handlers
// without forcing them to import the billing package directly.
package entitlements

import (
	"context"

	"github.com/google/uuid"

	"github.com/platform/api/internal/billing"
)

type Limits struct {
	MaxAlerts     int
	MaxLayouts    int
	MaxIndicators int
	HistoryDays   int
}

type Provider struct {
	repo *billing.Repo
}

func New(repo *billing.Repo) *Provider { return &Provider{repo: repo} }

// ForUser resolves the active plan and returns its limits. Always returns a
// non-nil Limits; on error it falls back to a conservative free-tier shape so
// feature handlers never hit a nil-pointer path.
func (p *Provider) ForUser(ctx context.Context, userID uuid.UUID) Limits {
	plan, err := p.repo.GetUserPlan(ctx, userID)
	if err != nil || plan == nil {
		return Limits{MaxAlerts: 5, MaxLayouts: 1, MaxIndicators: 3, HistoryDays: 7}
	}
	return Limits{
		MaxAlerts:     plan.MaxAlerts,
		MaxLayouts:    plan.MaxLayouts,
		MaxIndicators: plan.MaxIndicators,
		HistoryDays:   plan.HistoryDays,
	}
}
