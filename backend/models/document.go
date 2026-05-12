package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Document struct {
	ID                 uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Title              string         `gorm:"not null" json:"title"`
	Category           string         `json:"category"`
	SubCategory        string         `json:"sub_category"`
	Area               string         `json:"area"`
	Description        string         `json:"description"`
	FilePath           string         `json:"file_path"`
	FileName           string         `json:"file_name"`
	FileSize           int64          `json:"file_size"`
	UploadedBy         uuid.UUID      `gorm:"type:uuid" json:"uploaded_by"`
	Status             string         `gorm:"default:'active'" json:"status"`
	WatermarkText      string         `json:"watermark_text"`
	WatermarkColor     string         `json:"watermark_color"`
	WatermarkOpacity   float64        `json:"watermark_opacity"`
	WatermarkSize      float64        `json:"watermark_size"`
	WatermarkPosition  string         `json:"watermark_position"`
	WatermarkAngle     float64        `json:"watermark_angle"`
	UseGlobalWatermark bool           `gorm:"default:true" json:"use_global_watermark"`
	MaxPrint           int            `gorm:"default:0" json:"max_print"`
	AllowPreview       bool           `gorm:"default:true" json:"allow_preview"`
	ExpiryDate         *time.Time     `json:"expiry_date"`
	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `gorm:"index" json:"-"`
	Uploader           User           `gorm:"foreignKey:UploadedBy" json:"uploader,omitempty"`
}

func (d *Document) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}
