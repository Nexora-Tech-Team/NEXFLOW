package models

import "github.com/google/uuid"

const (
	AccessNone  = "none"
	AccessView  = "view"
	AccessEdit  = "edit"
	AccessAdmin = "admin"
)

type Permission struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	UserID      uuid.UUID `gorm:"type:uuid;not null;uniqueIndex:idx_user_module" json:"user_id"`
	ModuleID    uint      `gorm:"not null;uniqueIndex:idx_user_module" json:"module_id"`
	AccessLevel string    `gorm:"type:varchar(10);default:'none'" json:"access_level"`
	User        User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Module      Module    `gorm:"foreignKey:ModuleID" json:"module,omitempty"`
}
