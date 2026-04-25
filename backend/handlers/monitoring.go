package handlers

import (
	"net/http"

	"nextflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type MonitoringHandler struct {
	DB *gorm.DB
}

func (h *MonitoringHandler) Summary(c *gin.Context) {
	var totalDocs, activeDocs, obsoleteDocs int64
	h.DB.Model(&models.Document{}).Count(&totalDocs)
	h.DB.Model(&models.Document{}).Where("status = ?", "active").Count(&activeDocs)
	h.DB.Model(&models.Document{}).Where("status = ?", "obsolete").Count(&obsoleteDocs)

	var totalUsers, activeUsers int64
	h.DB.Model(&models.User{}).Count(&totalUsers)
	h.DB.Model(&models.User{}).Where("is_active = true").Count(&activeUsers)

	var totalTasks, doneTasks, pendingTasks int64
	h.DB.Model(&models.Task{}).Count(&totalTasks)
	h.DB.Model(&models.Task{}).Where("status = ?", models.TaskStatusDone).Count(&doneTasks)
	h.DB.Model(&models.Task{}).Where("status IN ?", []string{
		models.TaskStatusDraft, models.TaskStatusAssigned, models.TaskStatusInProgress,
	}).Count(&pendingTasks)

	var totalActivities int64
	h.DB.Model(&models.ActivityLog{}).Count(&totalActivities)

	var recentActivities []models.ActivityLog
	h.DB.Preload("User").Preload("Document").
		Order("created_at DESC").Limit(10).
		Find(&recentActivities)

	type CategoryStat struct {
		Category string `json:"category"`
		Count    int64  `json:"count"`
	}
	var catStats []CategoryStat
	h.DB.Table("documents").
		Select("category, COUNT(*) as count").
		Where("deleted_at IS NULL").
		Group("category").
		Order("count DESC").
		Scan(&catStats)

	c.JSON(http.StatusOK, gin.H{
		"documents": gin.H{
			"total":    totalDocs,
			"active":   activeDocs,
			"obsolete": obsoleteDocs,
		},
		"users": gin.H{
			"total":  totalUsers,
			"active": activeUsers,
		},
		"tasks": gin.H{
			"total":   totalTasks,
			"done":    doneTasks,
			"pending": pendingTasks,
		},
		"activities": gin.H{
			"total":  totalActivities,
			"recent": recentActivities,
		},
		"categories": catStats,
	})
}

func (h *MonitoringHandler) ActivityTable(c *gin.Context) {
	type ActivityStat struct {
		UserID       string `json:"user_id"`
		Username     string `json:"username"`
		Fullname     string `json:"fullname"`
		ActivityType string `json:"activity_type"`
		Count        int64  `json:"count"`
	}

	var stats []ActivityStat
	h.DB.Table("activity_logs").
		Select("activity_logs.user_id, users.username, users.fullname, activity_logs.activity_type, COUNT(*) as count").
		Joins("JOIN users ON users.id = activity_logs.user_id").
		Group("activity_logs.user_id, users.username, users.fullname, activity_logs.activity_type").
		Order("count DESC").
		Limit(100).
		Scan(&stats)

	var recentLogs []models.ActivityLog
	h.DB.Preload("User").Preload("Document").
		Order("created_at DESC").Limit(50).
		Find(&recentLogs)

	c.JSON(http.StatusOK, gin.H{
		"stats":   stats,
		"recent":  recentLogs,
	})
}

func (h *MonitoringHandler) PublicStats(c *gin.Context) {
	userIDVal, _ := c.Get("userID")

	var totalDocs, activeDocs int64
	h.DB.Model(&models.Document{}).Count(&totalDocs)
	h.DB.Model(&models.Document{}).Where("status = ?", "active").Count(&activeDocs)

	var totalTasks, myTotal, myDone, myPending int64
	h.DB.Model(&models.Task{}).Count(&totalTasks)
	h.DB.Model(&models.Task{}).Where("to_user_id = ?", userIDVal).Count(&myTotal)
	h.DB.Model(&models.Task{}).Where("to_user_id = ? AND status = ?", userIDVal, models.TaskStatusDone).Count(&myDone)
	h.DB.Model(&models.Task{}).Where("to_user_id = ? AND status IN ?", userIDVal, []string{
		models.TaskStatusDraft, models.TaskStatusAssigned, models.TaskStatusInProgress,
	}).Count(&myPending)

	type StatusCount struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}
	var statusCounts []StatusCount
	h.DB.Table("tasks").Select("status, COUNT(*) as count").
		Where("deleted_at IS NULL").Group("status").Scan(&statusCounts)

	type CategoryStat struct {
		Category string `json:"category"`
		Count    int64  `json:"count"`
	}
	var catStats []CategoryStat
	h.DB.Table("documents").Select("category, COUNT(*) as count").
		Where("deleted_at IS NULL").Group("category").Order("count DESC").Limit(6).Scan(&catStats)

	var recentActivities []models.ActivityLog
	h.DB.Preload("User").Preload("Document").Order("created_at DESC").Limit(5).Find(&recentActivities)

	c.JSON(http.StatusOK, gin.H{
		"documents":         gin.H{"total": totalDocs, "active": activeDocs},
		"tasks":             gin.H{"total": totalTasks, "my_total": myTotal, "my_done": myDone, "my_pending": myPending},
		"status_counts":     statusCounts,
		"categories":        catStats,
		"recent_activities": recentActivities,
	})
}

func (h *MonitoringHandler) TaskSummary(c *gin.Context) {
	type TaskStat struct {
		UserID   string `json:"user_id"`
		Username string `json:"username"`
		Fullname string `json:"fullname"`
		Assigned int64  `json:"assigned"`
		Done     int64  `json:"done"`
		Pending  int64  `json:"pending"`
		Total    int64  `json:"total"`
	}

	var users []models.User
	h.DB.Where("is_active = true").Find(&users)

	stats := []TaskStat{}
	for _, user := range users {
		var assigned, done, pending, total int64
		h.DB.Model(&models.Task{}).Where("to_user_id = ?", user.ID).Count(&total)
		h.DB.Model(&models.Task{}).Where("to_user_id = ? AND status = ?", user.ID, models.TaskStatusDone).Count(&done)
		h.DB.Model(&models.Task{}).Where("to_user_id = ? AND status = ?", user.ID, models.TaskStatusAssigned).Count(&assigned)
		h.DB.Model(&models.Task{}).Where("to_user_id = ? AND status IN ?", user.ID, []string{
			models.TaskStatusInProgress, models.TaskStatusDraft,
		}).Count(&pending)

		if total > 0 {
			stats = append(stats, TaskStat{
				UserID:   user.ID.String(),
				Username: user.Username,
				Fullname: user.Fullname,
				Assigned: assigned,
				Done:     done,
				Pending:  pending,
				Total:    total,
			})
		}
	}

	type StatusCount struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}
	var statusCounts []StatusCount
	h.DB.Table("tasks").
		Select("status, COUNT(*) as count").
		Where("deleted_at IS NULL").
		Group("status").
		Scan(&statusCounts)

	c.JSON(http.StatusOK, gin.H{
		"per_user":      stats,
		"status_counts": statusCounts,
	})
}
