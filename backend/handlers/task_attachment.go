package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"nextflow/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type TaskAttachmentHandler struct {
	DB         *gorm.DB
	UploadPath string
}

func (h *TaskAttachmentHandler) Upload(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uuid.UUID)

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File diperlukan"})
		return
	}

	if file.Size > 20<<20 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Ukuran file maksimal 20MB"})
		return
	}

	dir := filepath.Join(h.UploadPath, "tasks", taskID.String())
	if err := os.MkdirAll(dir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat direktori"})
		return
	}

	ext := filepath.Ext(file.Filename)
	savedName := uuid.New().String() + ext
	savePath := filepath.Join(dir, savedName)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan file"})
		return
	}

	attachment := models.TaskAttachment{
		TaskID:     taskID,
		FileName:   file.Filename,
		FilePath:   savePath,
		FileSize:   file.Size,
		UploadedBy: userID,
	}

	if err := h.DB.Create(&attachment).Error; err != nil {
		os.Remove(savePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan data"})
		return
	}

	h.DB.Preload("Uploader").First(&attachment, "id = ?", attachment.ID)
	c.JSON(http.StatusCreated, gin.H{"data": attachment})
}

func (h *TaskAttachmentHandler) List(c *gin.Context) {
	taskID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid task ID"})
		return
	}

	var attachments []models.TaskAttachment
	h.DB.Preload("Uploader").Where("task_id = ?", taskID).Order("created_at ASC").Find(&attachments)

	c.JSON(http.StatusOK, gin.H{"data": attachments})
}

func (h *TaskAttachmentHandler) Download(c *gin.Context) {
	aid, err := uuid.Parse(c.Param("aid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid attachment ID"})
		return
	}

	var attachment models.TaskAttachment
	if err := h.DB.First(&attachment, "id = ?", aid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File tidak ditemukan"})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, attachment.FileName))
	c.File(attachment.FilePath)
}

func (h *TaskAttachmentHandler) Delete(c *gin.Context) {
	aid, err := uuid.Parse(c.Param("aid"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid attachment ID"})
		return
	}

	var attachment models.TaskAttachment
	if err := h.DB.First(&attachment, "id = ?", aid).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "File tidak ditemukan"})
		return
	}

	os.Remove(attachment.FilePath)
	h.DB.Delete(&attachment)

	c.JSON(http.StatusOK, gin.H{"message": "File berhasil dihapus"})
}
