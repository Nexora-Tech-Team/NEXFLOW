package handlers

import (
	"net/http"

	"nextflow/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type NotificationHandler struct {
	DB *gorm.DB
}

func (h *NotificationHandler) List(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uuid.UUID)

	var notifs []models.Notification
	h.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(30).
		Find(&notifs)

	var unread int64
	h.DB.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = false", userID).
		Count(&unread)

	c.JSON(http.StatusOK, gin.H{"data": notifs, "unread": unread})
}

func (h *NotificationHandler) MarkRead(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uuid.UUID)

	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
		return
	}

	h.DB.Model(&models.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Update("is_read", true)

	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}

func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uuid.UUID)

	h.DB.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = false", userID).
		Update("is_read", true)

	c.JSON(http.StatusOK, gin.H{"message": "ok"})
}
