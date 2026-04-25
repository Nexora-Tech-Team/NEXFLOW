package utils

import (
	"nextflow/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func CreateNotification(db *gorm.DB, userID uuid.UUID, title, message, notifType string, refID *uuid.UUID) {
	n := models.Notification{
		UserID:  userID,
		Title:   title,
		Message: message,
		Type:    notifType,
		RefID:   refID,
	}
	db.Create(&n)
}
