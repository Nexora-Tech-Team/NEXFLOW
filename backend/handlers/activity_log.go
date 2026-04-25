package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"nextflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ActivityLogHandler struct {
	DB *gorm.DB
}

func (h *ActivityLogHandler) ListActivityLogs(c *gin.Context) {
	var logs []models.ActivityLog
	query := h.DB.Preload("User").Preload("Document")

	if userID := c.Query("user_id"); userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if actType := c.Query("type"); actType != "" {
		query = query.Where("activity_type = ?", actType)
	}
	if dateFrom := c.Query("date_from"); dateFrom != "" {
		query = query.Where("created_at >= ?", dateFrom)
	}
	if dateTo := c.Query("date_to"); dateTo != "" {
		query = query.Where("created_at <= ?", dateTo+" 23:59:59")
	}
	if docID := c.Query("document_id"); docID != "" {
		query = query.Where("document_id = ?", docID)
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.ActivityLog{}).Count(&total)

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch activity logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  logs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *ActivityLogHandler) ExportCSV(c *gin.Context) {
	var logs []models.ActivityLog

	query := h.DB.Preload("User").Preload("Document")

	// Filter
	if actType := c.Query("type"); actType != "" {
		query = query.Where("activity_type = ?", actType)
	}
	if dateFrom := c.Query("date_from"); dateFrom != "" {
		query = query.Where("created_at >= ?", dateFrom)
	}
	if dateTo := c.Query("date_to"); dateTo != "" {
		query = query.Where("created_at <= ?", dateTo+" 23:59:59")
	}

	// Execute query
	if err := query.Order("created_at DESC").Limit(5000).Find(&logs).Error; err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch activity logs"})
		return
	}

	// Header CSV
	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf(
		`attachment; filename="activity-log-%s.csv"`,
		time.Now().Format("2006-01-02"),
	))

	writer := csv.NewWriter(c.Writer)

	// Write header row
	if err := writer.Write([]string{
		"Waktu", "User", "Username", "Tipe", "Deskripsi", "IP", "Dokumen",
	}); err != nil {
		c.JSON(500, gin.H{"error": "Failed to write CSV header"})
		return
	}

	// Write data
	for _, log := range logs {
		// Safe Document access (struct, not pointer)
		docTitle := ""
		if log.Document.ID != ([16]byte{}) {
			docTitle = log.Document.Title
		}

		// Safe User access
		fullname := ""
		username := ""
		if log.User.ID != ([16]byte{}) {
			fullname = log.User.Fullname
			username = log.User.Username
		}

		row := []string{
			log.CreatedAt.Format("02/01/2006 15:04:05"),
			fullname,
			username,
			log.ActivityType,
			log.Description,
			log.IPAddress,
			docTitle,
		}

		if err := writer.Write(row); err != nil {
			c.JSON(500, gin.H{"error": "Failed to write CSV row"})
			return
		}
	}

	writer.Flush()

	// Check flush error
	if err := writer.Error(); err != nil {
		c.JSON(500, gin.H{"error": "Error finalizing CSV"})
		return
	}
}
