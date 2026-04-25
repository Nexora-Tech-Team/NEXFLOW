package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ActivityLog struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID       uuid.UUID `gorm:"type:uuid" json:"user_id"`
	ActivityType string    `gorm:"type:varchar(20);not null" json:"activity_type"`
	DocumentID   *uuid.UUID `gorm:"type:uuid" json:"document_id"`
	Description  string    `json:"description"`
	IPAddress    string    `json:"ip_address"`
	CreatedAt    time.Time `json:"created_at"`
	User         User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Document     *Document `gorm:"foreignKey:DocumentID" json:"document,omitempty"`
}

func (a *ActivityLog) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}
