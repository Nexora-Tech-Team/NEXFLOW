package models

type Module struct {
	ID    uint   `gorm:"primaryKey;autoIncrement" json:"id"`
	Name  string `gorm:"uniqueIndex;not null" json:"name"`
	Label string `gorm:"not null" json:"label"`
	Icon  string `json:"icon"`
	Order int    `json:"order"`
}
