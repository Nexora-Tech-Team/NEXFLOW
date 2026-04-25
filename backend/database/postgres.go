package database

import (
	"fmt"
	"log"
	"time"

	"nextflow/config"
	"nextflow/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Connect(cfg *config.Config) *gorm.DB {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable TimeZone=Asia/Jakarta",
		cfg.DBHost, cfg.DBPort, cfg.DBUser, cfg.DBPassword, cfg.DBName,
	)

	var db *gorm.DB
	var err error

	for i := 0; i < 10; i++ {
		db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
			Logger: logger.Default.LogMode(logger.Info),
		})
		if err == nil {
			break
		}
		log.Printf("Failed to connect to database, attempt %d/10: %v", i+1, err)
		time.Sleep(3 * time.Second)
	}

	if err != nil {
		log.Fatalf("Failed to connect to database after 10 attempts: %v", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		log.Fatalf("Failed to get underlying DB: %v", err)
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	AutoMigrate(db)
	log.Println("Database connected and migrated successfully")
	return db
}

func AutoMigrate(db *gorm.DB) {
	err := db.AutoMigrate(
		&models.User{},
		&models.Module{},
		&models.Permission{},
		&models.Document{},
		&models.GlobalWatermark{},
		&models.ActivityLog{},
		&models.Comment{},
		&models.OUUnit{},
		&models.Task{},
		&models.TaskComment{},
		&models.TaskStatusHistory{},
		&models.TaskAttachment{},
		&models.Notification{},
	)
	if err != nil {
		log.Fatalf("AutoMigrate failed: %v", err)
	}
}
