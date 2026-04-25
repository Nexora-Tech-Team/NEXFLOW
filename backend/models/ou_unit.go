package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OUUnit struct {
	ID             uuid.UUID  `gorm:"type:uuid;primaryKey" json:"id"`
	Name           string     `gorm:"not null" json:"name"`
	ParentID       *uuid.UUID `gorm:"type:uuid" json:"parent_id"`
	AssignedUserID *uuid.UUID `gorm:"type:uuid" json:"assigned_user_id"`
	Order          int        `gorm:"default:0" json:"order"`
	CreatedAt      time.Time  `json:"created_at"`
	Parent         *OUUnit    `gorm:"foreignKey:ParentID" json:"parent,omitempty"`
	AssignedUser   *User      `gorm:"foreignKey:AssignedUserID" json:"assigned_user,omitempty"`
	Children       []OUUnit   `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}

func (o *OUUnit) BeforeCreate(tx *gorm.DB) error {
	if o.ID == uuid.Nil {
		o.ID = uuid.New()
	}
	return nil
}
