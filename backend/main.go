package main

import (
	"log"
	"os"

	"nextflow/config"
	"nextflow/database"
	"nextflow/routes"
	"nextflow/utils"

	"github.com/gin-gonic/gin"
        "github.com/gin-contrib/cors"
)

func main() {
	cfg := config.Load()

	gin.SetMode(cfg.GinMode)

	db := database.Connect(cfg)

	// Run seeder
	database.Seed(db)

	// Create upload directory
	if err := os.MkdirAll(cfg.UploadPath, 0755); err != nil {
		log.Printf("Warning: Could not create upload directory: %v", err)
	}

	r := gin.Default()
        r.Use(cors.Default())

        r.MaxMultipartMemory = 50 << 20 // 50 MB

	routes.Setup(r, db, cfg)

	// Start deadline reminder scheduler
	utils.StartDeadlineReminder(db, utils.EmailConfig{
		Host: cfg.SMTPHost, Port: cfg.SMTPPort,
		User: cfg.SMTPUser, Pass: cfg.SMTPPass, From: cfg.SMTPFrom,
	})

	addr := ":8080"
	log.Printf("NexFlow API server starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
