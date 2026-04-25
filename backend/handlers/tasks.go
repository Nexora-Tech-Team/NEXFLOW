package handlers

import (
	"encoding/csv"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"nextflow/models"
	"nextflow/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TaskHandler struct {
	DB          *gorm.DB
	EmailConfig utils.EmailConfig
	UploadPath  string
}

func (h *TaskHandler) ListTasks(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uuid.UUID)

	var tasks []models.Task
	query := h.DB.Preload("FromUser").Preload("ToUser")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if priority := c.Query("priority"); priority != "" {
		query = query.Where("priority = ?", priority)
	}
	if mine := c.Query("mine"); mine == "true" {
		query = query.Where("from_user_id = ? OR to_user_id = ?", userID, userID)
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.Task{}).Count(&total)

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&tasks).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch tasks"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": tasks, "total": total, "page": page, "limit": limit})
}

func (h *TaskHandler) CreateTask(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uuid.UUID)

	var req struct {
		Title       string  `json:"title" binding:"required"`
		Description string  `json:"description"`
		ToUserID    string  `json:"to_user_id" binding:"required"`
		Priority    string  `json:"priority"`
		Deadline    *string `json:"deadline"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	toUserID, err := uuid.Parse(req.ToUserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid to_user_id"})
		return
	}

	priority := req.Priority
	if priority == "" {
		priority = models.PriorityMedium
	}

	task := models.Task{
		Title:       req.Title,
		Description: req.Description,
		FromUserID:  userID,
		ToUserID:    toUserID,
		Priority:    priority,
		Status:      models.TaskStatusDraft,
	}

	if req.Deadline != nil {
		deadline, err := time.Parse("2006-01-02", *req.Deadline)
		if err == nil {
			task.Deadline = &deadline
		}
	}

	if err := h.DB.Create(&task).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create task"})
		return
	}

	h.DB.Preload("FromUser").Preload("ToUser").First(&task, "id = ?", task.ID)

	// Notifikasi in-app
	msg := task.FromUser.Fullname + " mendelegasikan tugas kepada Anda: " + task.Title
	utils.CreateNotification(h.DB, task.ToUserID, "Delegasi Tugas Baru", msg, "task", &task.ID)

	// Notifikasi email (async)
	go h.sendAssignmentEmail(task)

	c.JSON(http.StatusCreated, gin.H{"data": task})
}

func (h *TaskHandler) GetTask(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var task models.Task
	if err := h.DB.Preload("FromUser").Preload("ToUser").First(&task, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": task})
}

func (h *TaskHandler) UpdateTask(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var task models.Task
	if err := h.DB.First(&task, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	prevToUserID := task.ToUserID

	var req struct {
		Title       string  `json:"title"`
		Description string  `json:"description"`
		ToUserID    string  `json:"to_user_id"`
		Priority    string  `json:"priority"`
		Deadline    *string `json:"deadline"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Priority != "" {
		updates["priority"] = req.Priority
	}

	reassigned := false
	if req.ToUserID != "" {
		toUserID, err := uuid.Parse(req.ToUserID)
		if err == nil {
			updates["to_user_id"] = toUserID
			reassigned = toUserID != prevToUserID
		}
	}
	if req.Deadline != nil {
		deadline, err := time.Parse("2006-01-02", *req.Deadline)
		if err == nil {
			updates["deadline"] = deadline
		}
	}

	if err := h.DB.Model(&task).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task"})
		return
	}

	h.DB.Preload("FromUser").Preload("ToUser").First(&task, "id = ?", id)

	if reassigned {
		msg := task.FromUser.Fullname + " mendelegasikan tugas kepada Anda: " + task.Title
		utils.CreateNotification(h.DB, task.ToUserID, "Delegasi Tugas Baru", msg, "task", &task.ID)
		go h.sendAssignmentEmail(task)
	}

	c.JSON(http.StatusOK, gin.H{"data": task})
}

func (h *TaskHandler) UpdateTaskStatus(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uuid.UUID)

	var task models.Task
	if err := h.DB.First(&task, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Task not found"})
		return
	}

	var req struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	validStatuses := map[string]bool{
		models.TaskStatusDraft: true, models.TaskStatusAssigned: true,
		models.TaskStatusInProgress: true, models.TaskStatusDone: true,
		models.TaskStatusRejected: true,
	}

	if !validStatuses[req.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	prevStatus := task.Status
	if err := h.DB.Model(&task).Update("status", req.Status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update task status"})
		return
	}

	// Simpan history
	h.DB.Create(&models.TaskStatusHistory{
		TaskID:      id,
		FromStatus:  prevStatus,
		ToStatus:    req.Status,
		ChangedByID: userID,
	})

	c.JSON(http.StatusOK, gin.H{"message": "Task status updated", "status": req.Status})
}

func (h *TaskHandler) UpdateProgress(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var req struct {
		Progress int `json:"progress" binding:"min=0,max=100"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.DB.Model(&models.Task{}).Where("id = ?", id).Update("progress", req.Progress).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update progress"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Progress updated", "progress": req.Progress})
}

func (h *TaskHandler) GetHistory(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var history []models.TaskStatusHistory
	h.DB.Preload("ChangedBy").Where("task_id = ?", id).Order("created_at ASC").Find(&history)

	c.JSON(http.StatusOK, gin.H{"data": history})
}

func (h *TaskHandler) ExportCSV(c *gin.Context) {
	var tasks []models.Task
	query := h.DB.Preload("FromUser").Preload("ToUser")

	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if priority := c.Query("priority"); priority != "" {
		query = query.Where("priority = ?", priority)
	}

	query.Order("created_at DESC").Find(&tasks)

	priorityLabel := map[string]string{"low": "Rendah", "medium": "Sedang", "high": "Tinggi"}
	statusLabel := map[string]string{
		"draft": "Draft", "assigned": "Ditugaskan", "in_progress": "Dikerjakan",
		"done": "Selesai", "rejected": "Ditolak",
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="delegasi-tugas-%s.csv"`, time.Now().Format("2006-01-02")))

	w := csv.NewWriter(c.Writer)
	w.Write([]string{"No", "Judul", "Deskripsi", "Dari", "Ditugaskan ke", "Prioritas", "Status", "Progress (%)", "Deadline", "Dibuat"})

	for i, t := range tasks {
		deadline := ""
		if t.Deadline != nil {
			deadline = t.Deadline.Format("02/01/2006")
		}
		w.Write([]string{
			strconv.Itoa(i + 1),
			t.Title,
			t.Description,
			t.FromUser.Fullname,
			t.ToUser.Fullname,
			priorityLabel[t.Priority],
			statusLabel[t.Status],
			strconv.Itoa(t.Progress),
			deadline,
			t.CreatedAt.Format("02/01/2006 15:04"),
		})
	}
	w.Flush()
}

func (h *TaskHandler) AddComment(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uuid.UUID)

	var req struct {
		Text string `json:"text" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	comment := models.TaskComment{TaskID: taskID, UserID: userID, Text: req.Text}
	if err := h.DB.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add comment"})
		return
	}

	h.DB.Preload("User").First(&comment, "id = ?", comment.ID)
	c.JSON(http.StatusCreated, gin.H{"data": comment})
}

func (h *TaskHandler) ListComments(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var comments []models.TaskComment
	if err := h.DB.Preload("User").Where("task_id = ?", taskID).Order("created_at ASC").Find(&comments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": comments})
}

func (h *TaskHandler) sendAssignmentEmail(task models.Task) {
	if task.ToUser.Email == "" {
		return
	}
	err := utils.SendTaskAssignedEmail(
		h.EmailConfig,
		task.ToUser.Email, task.ToUser.Fullname, task.FromUser.Fullname,
		task.Title, task.Description, task.Priority, task.Deadline,
	)
	if err != nil {
		log.Printf("[EMAIL] Gagal kirim notifikasi ke %s: %v", task.ToUser.Email, err)
	} else {
		log.Printf("[EMAIL] Notifikasi terkirim ke %s (%s)", task.ToUser.Fullname, task.ToUser.Email)
	}
}
