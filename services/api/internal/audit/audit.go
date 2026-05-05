package audit

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Recorder struct {
	db  *pgxpool.Pool
	log *slog.Logger
}

func NewRecorder(db *pgxpool.Pool, log *slog.Logger) *Recorder {
	return &Recorder{db: db, log: log}
}

// Record writes an auth_audit row. Errors are logged, never returned —
// audit failure must never block an auth flow.
func (r *Recorder) Record(ctx context.Context, userID *uuid.UUID, event, ip, ua string, metadata map[string]any) {
	var meta []byte
	if metadata != nil {
		b, err := json.Marshal(metadata)
		if err == nil {
			meta = b
		}
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO auth_audit (user_id, event, ip, user_agent, metadata)
		VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), $5)
	`, userID, event, ip, ua, meta)
	if err != nil {
		r.log.Error("audit write failed", "event", event, "err", err)
	}
}
