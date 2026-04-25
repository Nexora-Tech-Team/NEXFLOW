package database

import (
	"log"
	"time"

	"nextflow/models"
	"nextflow/utils"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func Seed(db *gorm.DB) {
	seedModules(db)
	seedUsers(db)
	seedPermissions(db)
	seedGlobalWatermark(db)
	seedDocuments(db)
	seedOUUnits(db)
	seedTasks(db)
	log.Println("Seeding completed")
}

func seedModules(db *gorm.DB) {
	var count int64
	db.Model(&models.Module{}).Count(&count)
	if count > 0 {
		return
	}

	modules := []models.Module{
		{Name: "edoc", Label: "eDoc - Document Center", Icon: "document", Order: 1},
		{Name: "ememo", Label: "eMemo - Task & Organization", Icon: "memo", Order: 2},
	}
	db.Create(&modules)
	log.Println("Modules seeded")
}

func seedUsers(db *gorm.DB) {
	var count int64
	db.Model(&models.User{}).Count(&count)
	if count > 0 {
		return
	}

	users := []struct {
		username string
		password string
		fullname string
		email    string
	}{
		{"admin", "admin123", "Administrator", "admin@tolan3.com"},
		{"fahrizal", "fahrizal123", "Fahrizal Ramadhani", "fahrizal@tolan3.com"},
		{"arya", "arya123", "Arya Pratama", "arya@tolan3.com"},
	}

	for _, u := range users {
		hash, err := utils.HashPassword(u.password)
		if err != nil {
			log.Printf("Failed to hash password for %s: %v", u.username, err)
			continue
		}
		user := models.User{
			Username: u.username,
			Password: hash,
			Fullname: u.fullname,
			Email:    u.email,
			IsActive: true,
		}
		db.Create(&user)
	}
	log.Println("Users seeded")
}

func seedPermissions(db *gorm.DB) {
	var count int64
	db.Model(&models.Permission{}).Count(&count)
	if count > 0 {
		return
	}

	var edoc, ememo models.Module
	db.Where("name = ?", "edoc").First(&edoc)
	db.Where("name = ?", "ememo").First(&ememo)

	var admin, fahrizal, arya models.User
	db.Where("username = ?", "admin").First(&admin)
	db.Where("username = ?", "fahrizal").First(&fahrizal)
	db.Where("username = ?", "arya").First(&arya)

	permissions := []models.Permission{
		{UserID: admin.ID, ModuleID: edoc.ID, AccessLevel: models.AccessAdmin},
		{UserID: admin.ID, ModuleID: ememo.ID, AccessLevel: models.AccessAdmin},
		{UserID: fahrizal.ID, ModuleID: edoc.ID, AccessLevel: models.AccessEdit},
		{UserID: fahrizal.ID, ModuleID: ememo.ID, AccessLevel: models.AccessView},
		{UserID: arya.ID, ModuleID: edoc.ID, AccessLevel: models.AccessView},
		{UserID: arya.ID, ModuleID: ememo.ID, AccessLevel: models.AccessEdit},
	}
	db.Create(&permissions)
	log.Println("Permissions seeded")
}

func seedGlobalWatermark(db *gorm.DB) {
	var count int64
	db.Model(&models.GlobalWatermark{}).Count(&count)
	if count > 0 {
		return
	}

	var admin models.User
	db.Where("username = ?", "admin").First(&admin)

	wm := models.GlobalWatermark{
		Text:      "FOR INTERNAL USE",
		Color:     "#cccccc",
		Opacity:   15,
		Size:      36,
		Position:  "diagonal",
		Angle:     35,
		UpdatedBy: admin.ID,
		UpdatedAt: time.Now(),
	}
	db.Create(&wm)
	log.Println("Global watermark seeded")
}

func seedDocuments(db *gorm.DB) {
	var count int64
	db.Model(&models.Document{}).Count(&count)
	if count > 0 {
		return
	}

	var admin, fahrizal models.User
	db.Where("username = ?", "admin").First(&admin)
	db.Where("username = ?", "fahrizal").First(&fahrizal)

	docs := []models.Document{
		{
			Title: "Standard Operating Procedure - Estate Management",
			Category: "ESTATES", SubCategory: "SOP", Area: "North Sumatra",
			Description: "SOP for estate management operations",
			FileName: "sop_estate_mgmt.pdf", FileSize: 1024000,
			UploadedBy: admin.ID, Status: "active", UseGlobalWatermark: true,
		},
		{
			Title: "Monthly Production Report - January 2024",
			Category: "ESTATES", SubCategory: "Report", Area: "South Sumatra",
			Description: "Monthly production report for January 2024",
			FileName: "prod_report_jan24.pdf", FileSize: 2048000,
			UploadedBy: fahrizal.ID, Status: "active", UseGlobalWatermark: true,
		},
		{
			Title: "HR Policy Manual 2024",
			Category: "DEPARTMENT", SubCategory: "HR", Area: "Head Office",
			Description: "Updated HR policy manual for year 2024",
			FileName: "hr_policy_2024.pdf", FileSize: 3072000,
			UploadedBy: admin.ID, Status: "active", UseGlobalWatermark: true,
		},
		{
			Title: "Mill Operation Guidelines",
			Category: "MILLS", SubCategory: "Guidelines", Area: "Kisaran",
			Description: "Operational guidelines for palm oil mills",
			FileName: "mill_guidelines.pdf", FileSize: 1536000,
			UploadedBy: admin.ID, Status: "active", UseGlobalWatermark: true,
		},
		{
			Title: "ISO 9001:2015 Quality Manual",
			Category: "ISO", SubCategory: "Quality", Area: "All Areas",
			Description: "Quality management system manual ISO 9001:2015",
			FileName: "iso_quality_manual.pdf", FileSize: 4096000,
			UploadedBy: admin.ID, Status: "active", UseGlobalWatermark: true,
		},
		{
			Title: "Environmental Impact Assessment Report",
			Category: "ESTATES", SubCategory: "Environmental", Area: "Riau",
			Description: "EIA report for new plantation area",
			FileName: "eia_report_riau.pdf", FileSize: 5120000,
			UploadedBy: fahrizal.ID, Status: "active", UseGlobalWatermark: true,
		},
		{
			Title: "IT System Infrastructure Manual",
			Category: "DEPARTMENT", SubCategory: "IT", Area: "Head Office",
			Description: "IT infrastructure documentation",
			FileName: "it_infra_manual.pdf", FileSize: 2560000,
			UploadedBy: admin.ID, Status: "active",
			UseGlobalWatermark: false,
			WatermarkText: "CONFIDENTIAL", WatermarkColor: "#ff0000",
			WatermarkOpacity: 20, WatermarkSize: 40, WatermarkAngle: 45,
		},
		{
			Title: "Supply Chain Management SOP",
			Category: "DEPARTMENT", SubCategory: "Supply Chain", Area: "All Areas",
			Description: "Standard procedures for supply chain management",
			FileName: "scm_sop.pdf", FileSize: 1792000,
			UploadedBy: admin.ID, Status: "active", UseGlobalWatermark: true,
		},
		{
			Title: "ISO 14001 Environmental Management",
			Category: "ISO", SubCategory: "Environmental", Area: "All Areas",
			Description: "Environmental management system documentation",
			FileName: "iso_env_mgmt.pdf", FileSize: 3584000,
			UploadedBy: admin.ID, Status: "active", UseGlobalWatermark: true,
		},
		{
			Title: "SIM User Guide v2.0",
			Category: "SIM", SubCategory: "User Guide", Area: "All Areas",
			Description: "User guide for SIM (Sistem Informasi Manajemen)",
			FileName: "sim_userguide_v2.pdf", FileSize: 2048000,
			UploadedBy: admin.ID, Status: "obsolete", UseGlobalWatermark: true,
		},
	}

	for i := range docs {
		docs[i].ID = uuid.New()
	}
	db.Create(&docs)
	log.Println("Documents seeded")
}

func seedOUUnits(db *gorm.DB) {
	var count int64
	db.Model(&models.OUUnit{}).Count(&count)
	if count > 0 {
		return
	}

	var admin, fahrizal, arya models.User
	db.Where("username = ?", "admin").First(&admin)
	db.Where("username = ?", "fahrizal").First(&fahrizal)
	db.Where("username = ?", "arya").First(&arya)

	dirut := models.OUUnit{
		ID: uuid.New(), Name: "Direktur Utama",
		AssignedUserID: &admin.ID, Order: 1,
	}
	db.Create(&dirut)

	mgEstate := models.OUUnit{
		ID: uuid.New(), Name: "Manager Estate",
		ParentID: &dirut.ID, AssignedUserID: &fahrizal.ID, Order: 1,
	}
	mgQuality := models.OUUnit{
		ID: uuid.New(), Name: "Manager Quality",
		ParentID: &dirut.ID, AssignedUserID: &fahrizal.ID, Order: 2,
	}
	db.Create(&mgEstate)
	db.Create(&mgQuality)

	staffESD := models.OUUnit{
		ID: uuid.New(), Name: "Staff ESD",
		ParentID: &mgEstate.ID, AssignedUserID: &arya.ID, Order: 1,
	}
	staffQA := models.OUUnit{
		ID: uuid.New(), Name: "Staff QA",
		ParentID: &mgQuality.ID, AssignedUserID: &arya.ID, Order: 1,
	}
	db.Create(&staffESD)
	db.Create(&staffQA)

	log.Println("OU Units seeded")
}

func seedTasks(db *gorm.DB) {
	var count int64
	db.Model(&models.Task{}).Count(&count)
	if count > 0 {
		return
	}

	var admin, fahrizal, arya models.User
	db.Where("username = ?", "admin").First(&admin)
	db.Where("username = ?", "fahrizal").First(&fahrizal)
	db.Where("username = ?", "arya").First(&arya)

	deadline1 := time.Now().AddDate(0, 0, 7)
	deadline2 := time.Now().AddDate(0, 0, 14)
	deadline3 := time.Now().AddDate(0, 0, 3)
	deadline4 := time.Now().AddDate(0, 0, 21)

	tasks := []models.Task{
		{
			ID: uuid.New(), Title: "Review Q1 Production Report",
			Description: "Review and approve the Q1 production report for all estates",
			FromUserID: admin.ID, ToUserID: fahrizal.ID,
			Priority: models.PriorityHigh, Status: models.TaskStatusInProgress,
			Deadline: &deadline1,
		},
		{
			ID: uuid.New(), Title: "Update ISO Documentation",
			Description: "Update ISO 9001 documentation to reflect new procedures",
			FromUserID: fahrizal.ID, ToUserID: arya.ID,
			Priority: models.PriorityMedium, Status: models.TaskStatusAssigned,
			Deadline: &deadline2,
		},
		{
			ID: uuid.New(), Title: "Prepare Monthly Activity Report",
			Description: "Compile and prepare the monthly activity report for management",
			FromUserID: admin.ID, ToUserID: arya.ID,
			Priority: models.PriorityHigh, Status: models.TaskStatusDone,
			Deadline: &deadline3,
		},
		{
			ID: uuid.New(), Title: "Environmental Compliance Check",
			Description: "Conduct environmental compliance check for all plantation areas",
			FromUserID: admin.ID, ToUserID: fahrizal.ID,
			Priority: models.PriorityLow, Status: models.TaskStatusDraft,
			Deadline: &deadline4,
		},
	}
	db.Create(&tasks)
	log.Println("Tasks seeded")
}
