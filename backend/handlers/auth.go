package handlers

import (
	"net/http"
	"time"

	"nextflow/models"
	"nextflow/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuthHandler struct {
	DB        *gorm.DB
	JWTSecret string
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type UserPermissionResponse struct {
	ModuleName  string `json:"module_name"`
	ModuleLabel string `json:"module_label"`
	AccessLevel string `json:"access_level"`
}

type LoginResponse struct {
	Token       string                   `json:"token"`
	ExpiresAt   time.Time                `json:"expires_at"`
	User        UserInfo                 `json:"user"`
	Permissions []UserPermissionResponse `json:"permissions"`
}

type UserInfo struct {
	ID       uuid.UUID `json:"id"`
	Username string    `json:"username"`
	Fullname string    `json:"fullname"`
	Email    string    `json:"email"`
	IsActive bool      `json:"is_active"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username and password are required"})
		return
	}

	var user models.User
	if err := h.DB.Where("username = ? AND is_active = true", req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	if !utils.CheckPassword(req.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid username or password"})
		return
	}

	token, err := utils.GenerateToken(user.ID, user.Username, user.Fullname, h.JWTSecret)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	permissions := h.getUserPermissions(user.ID)

	logActivity(h.DB, user.ID, "login", nil, "User logged in", c.ClientIP())

	c.JSON(http.StatusOK, LoginResponse{
		Token:     token,
		ExpiresAt: time.Now().Add(24 * time.Hour),
		User: UserInfo{
			ID: user.ID, Username: user.Username,
			Fullname: user.Fullname, Email: user.Email, IsActive: user.IsActive,
		},
		Permissions: permissions,
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	userID, _ := c.Get("userID")
	if uid, ok := userID.(uuid.UUID); ok {
		logActivity(h.DB, uid, "logout", nil, "User logged out", c.ClientIP())
	}
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uuid.UUID)

	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	permissions := h.getUserPermissions(userID)

	c.JSON(http.StatusOK, gin.H{
		"user": UserInfo{
			ID: user.ID, Username: user.Username,
			Fullname: user.Fullname, Email: user.Email, IsActive: user.IsActive,
		},
		"permissions": permissions,
	})
}

func (h *AuthHandler) getUserPermissions(userID uuid.UUID) []UserPermissionResponse {
	var perms []struct {
		ModuleName  string
		ModuleLabel string
		AccessLevel string
	}

	h.DB.Table("permissions").
		Select("modules.name as module_name, modules.label as module_label, permissions.access_level").
		Joins("JOIN modules ON modules.id = permissions.module_id").
		Where("permissions.user_id = ?", userID).
		Scan(&perms)

	result := make([]UserPermissionResponse, len(perms))
	for i, p := range perms {
		result[i] = UserPermissionResponse{
			ModuleName:  p.ModuleName,
			ModuleLabel: p.ModuleLabel,
			AccessLevel: p.AccessLevel,
		}
	}
	return result
}

func logActivity(db *gorm.DB, userID uuid.UUID, actType string, docID *uuid.UUID, description, ip string) {
	log := models.ActivityLog{
		UserID:       userID,
		ActivityType: actType,
		DocumentID:   docID,
		Description:  description,
		IPAddress:    ip,
	}
	db.Create(&log)
}
