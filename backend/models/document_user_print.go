package models

import (
	"time"

	"github.com/google/uuid"
)

type DocumentUserPrint struct {
	ID         uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID     uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_user_doc_print" json:"user_id"`
	DocumentID uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_user_doc_print" json:"document_id"`
	PrintCount int       `gorm:"default:0" json:"print_count"`
	UpdatedAt  time.Time `json:"updated_at"`
}
