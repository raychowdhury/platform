package auth

import (
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/platform/api/internal/httputil"
)

type Handlers struct {
	svc  *Service
	repo *Repo
}

func NewHandlers(svc *Service, repo *Repo) *Handlers {
	return &Handlers{svc: svc, repo: repo}
}

// ---------- DTOs ----------

type signupReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type signupResp struct {
	UserID            uuid.UUID `json:"user_id"`
	Email             string    `json:"email"`
	VerificationToken string    `json:"verification_token,omitempty"`
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type refreshReq struct {
	RefreshToken string `json:"refresh_token"`
}

type logoutReq struct {
	RefreshToken string `json:"refresh_token"`
}

type verifyEmailReq struct {
	Token string `json:"token"`
}

type changePasswordReq struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

type resetRequestReq struct {
	Email string `json:"email"`
}

type resetConfirmReq struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

type meResp struct {
	ID              uuid.UUID  `json:"id"`
	Email           string     `json:"email"`
	Status          string     `json:"status"`
	EmailVerifiedAt *time.Time `json:"email_verified_at"`
	LastLoginAt     *time.Time `json:"last_login_at"`
	CreatedAt       time.Time  `json:"created_at"`
}

// ---------- handlers ----------

func (h *Handlers) Signup(w http.ResponseWriter, r *http.Request) {
	var req signupReq
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	res, err := h.svc.Signup(r.Context(), req.Email, req.Password, httputil.ClientIP(r), r.UserAgent())
	if err != nil {
		mapErr(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusCreated, signupResp{
		UserID:            res.User.ID,
		Email:             res.User.Email,
		VerificationToken: res.VerificationToken,
	})
}

func (h *Handlers) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var req verifyEmailReq
	if err := httputil.DecodeJSON(r, &req); err != nil || req.Token == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if err := h.svc.VerifyEmail(r.Context(), req.Token, httputil.ClientIP(r), r.UserAgent()); err != nil {
		mapErr(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusNoContent, nil)
}

func (h *Handlers) Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	pair, _, err := h.svc.Login(r.Context(), req.Email, req.Password, httputil.ClientIP(r), r.UserAgent())
	if err != nil {
		mapErr(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, pair)
}

func (h *Handlers) Refresh(w http.ResponseWriter, r *http.Request) {
	var req refreshReq
	if err := httputil.DecodeJSON(r, &req); err != nil || req.RefreshToken == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	pair, err := h.svc.Refresh(r.Context(), req.RefreshToken, httputil.ClientIP(r), r.UserAgent())
	if err != nil {
		mapErr(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, pair)
}

func (h *Handlers) Logout(uidProvider func(*http.Request) uuid.UUID) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req logoutReq
		_ = httputil.DecodeJSON(r, &req) // body optional
		uid := uidProvider(r)
		if err := h.svc.Logout(r.Context(), req.RefreshToken, httputil.ClientIP(r), r.UserAgent(), uid); err != nil {
			mapErr(w, err)
			return
		}
		httputil.WriteJSON(w, http.StatusNoContent, nil)
	}
}

func (h *Handlers) Me(uidProvider func(*http.Request) uuid.UUID) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid := uidProvider(r)
		u, err := h.repo.GetUserByID(r.Context(), uid)
		if err != nil {
			mapErr(w, err)
			return
		}
		httputil.WriteJSON(w, http.StatusOK, meResp{
			ID:              u.ID,
			Email:           u.Email,
			Status:          u.Status,
			EmailVerifiedAt: u.EmailVerifiedAt,
			LastLoginAt:     u.LastLoginAt,
			CreatedAt:       u.CreatedAt,
		})
	}
}

func (h *Handlers) ChangePassword(uidProvider func(*http.Request) uuid.UUID) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req changePasswordReq
		if err := httputil.DecodeJSON(r, &req); err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "invalid body")
			return
		}
		uid := uidProvider(r)
		if err := h.svc.ChangePassword(r.Context(), uid, req.OldPassword, req.NewPassword, httputil.ClientIP(r), r.UserAgent()); err != nil {
			mapErr(w, err)
			return
		}
		httputil.WriteJSON(w, http.StatusNoContent, nil)
	}
}

func (h *Handlers) RequestPasswordReset(w http.ResponseWriter, r *http.Request) {
	var req resetRequestReq
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	tok, err := h.svc.RequestPasswordReset(r.Context(), req.Email, httputil.ClientIP(r), r.UserAgent())
	if err != nil {
		mapErr(w, err)
		return
	}
	// Sprint 1: token is returned for dev/test. Sprint 5: emailed instead, response always 202 with no body.
	if tok == "" {
		httputil.WriteJSON(w, http.StatusAccepted, nil)
		return
	}
	httputil.WriteJSON(w, http.StatusAccepted, map[string]string{"reset_token": tok})
}

func (h *Handlers) ConfirmPasswordReset(w http.ResponseWriter, r *http.Request) {
	var req resetConfirmReq
	if err := httputil.DecodeJSON(r, &req); err != nil || req.Token == "" {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if err := h.svc.ConfirmPasswordReset(r.Context(), req.Token, req.NewPassword, httputil.ClientIP(r), r.UserAgent()); err != nil {
		mapErr(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusNoContent, nil)
}

// ---------- error mapping ----------

func mapErr(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrEmailAlreadyTaken):
		httputil.WriteError(w, http.StatusConflict, err.Error())
	case errors.Is(err, ErrInvalidCredentials):
		httputil.WriteError(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, ErrAccountLocked):
		httputil.WriteError(w, http.StatusLocked, err.Error())
	case errors.Is(err, ErrAccountInactive):
		httputil.WriteError(w, http.StatusForbidden, err.Error())
	case errors.Is(err, ErrTokenNotFound):
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, ErrUserNotFound):
		httputil.WriteError(w, http.StatusNotFound, err.Error())
	default:
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
	}
}
