package models

import (
	"time"

	"github.com/google/uuid"
)

type GlobalWatermark struct {
	ID        uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Type      string    `gorm:"default:'text'" json:"type"` // "text" or "image"
	Text      string    `gorm:"not null" json:"text"`
	Color     string    `gorm:"default:'#cccccc'" json:"color"`
	Opacity   float64   `gorm:"default:15" json:"opacity"`
	Size      float64   `gorm:"default:36" json:"size"`
	Position  string    `gorm:"default:'diagonal'" json:"position"`
	Angle     float64   `gorm:"default:35" json:"angle"`
	Tiled     bool      `gorm:"default:false" json:"tiled"`
	ImagePath string    `gorm:"default:''" json:"image_path"`
	UpdatedBy uuid.UUID `gorm:"type:uuid" json:"updated_by"`
	UpdatedAt time.Time `json:"updated_at"`
	Updater   User      `gorm:"foreignKey:UpdatedBy" json:"updater,omitempty"`
}
