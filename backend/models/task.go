package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	PriorityLow    = "low"
	PriorityMedium = "medium"
	PriorityHigh   = "high"

	TaskStatusDraft      = "draft"
	TaskStatusAssigned   = "assigned"
	TaskStatusInProgress = "in_progress"
	TaskStatusDone       = "done"
	TaskStatusRejected   = "rejected"
)

type Task struct {
	ID          uuid.UUID      `gorm:"type:uuid;primaryKey" json:"id"`
	Title       string         `gorm:"not null" json:"title"`
	Description string         `json:"description"`
	FromUserID  uuid.UUID      `gorm:"type:uuid;not null" json:"from_user_id"`
	ToUserID    uuid.UUID      `gorm:"type:uuid;not null" json:"to_user_id"`
	Priority    string         `gorm:"type:varchar(10);default:'medium'" json:"priority"`
	Status      string         `gorm:"type:varchar(20);default:'draft'" json:"status"`
	Progress    int            `gorm:"default:0" json:"progress"`
	Deadline    *time.Time     `json:"deadline"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	FromUser    User           `gorm:"foreignKey:FromUserID" json:"from_user,omitempty"`
	ToUser      User           `gorm:"foreignKey:ToUserID" json:"to_user,omitempty"`
	Comments    []TaskComment  `gorm:"foreignKey:TaskID" json:"comments,omitempty"`
}

func (t *Task) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}

type TaskComment struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	TaskID    uuid.UUID `gorm:"type:uuid;not null" json:"task_id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null" json:"user_id"`
	Text      string    `gorm:"not null" json:"text"`
	CreatedAt time.Time `json:"created_at"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (tc *TaskComment) BeforeCreate(tx *gorm.DB) error {
	if tc.ID == uuid.Nil {
		tc.ID = uuid.New()
	}
	return nil
}

type TaskStatusHistory struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	TaskID      uuid.UUID `gorm:"type:uuid;not null;index" json:"task_id"`
	FromStatus  string    `json:"from_status"`
	ToStatus    string    `gorm:"not null" json:"to_status"`
	ChangedByID uuid.UUID `gorm:"type:uuid" json:"changed_by_id"`
	ChangedBy   User      `gorm:"foreignKey:ChangedByID" json:"changed_by,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

func (h *TaskStatusHistory) BeforeCreate(tx *gorm.DB) error {
	if h.ID == uuid.Nil {
		h.ID = uuid.New()
	}
	return nil
}

type TaskAttachment struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	TaskID     uuid.UUID `gorm:"type:uuid;not null;index" json:"task_id"`
	FileName   string    `gorm:"not null" json:"file_name"`
	FilePath   string    `gorm:"not null" json:"file_path"`
	FileSize   int64     `json:"file_size"`
	UploadedBy uuid.UUID `gorm:"type:uuid" json:"uploaded_by"`
	Uploader   User      `gorm:"foreignKey:UploadedBy" json:"uploader,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

func (a *TaskAttachment) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}
