package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"time"

	"nextflow/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type WatermarkHandler struct {
	DB         *gorm.DB
	UploadPath string
}

func (h *WatermarkHandler) GetGlobal(c *gin.Context) {
	var wm models.GlobalWatermark
	if err := h.DB.Preload("Updater").First(&wm).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Global watermark not configured"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": wm})
}

func (h *WatermarkHandler) UpdateGlobal(c *gin.Context) {
	var req struct {
		Type      string  `json:"type"`
		Text      string  `json:"text"`
		Color     string  `json:"color"`
		Opacity   float64 `json:"opacity"`
		Size      float64 `json:"size"`
		Position  string  `json:"position"`
		Angle     float64 `json:"angle"`
		Tiled     bool    `json:"tiled"`
		ImagePath string  `json:"image_path"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Type == "" {
		req.Type = "text"
	}
	if req.Type == "text" && req.Text == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Teks watermark tidak boleh kosong"})
		return
	}

	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uuid.UUID)

	var wm models.GlobalWatermark
	if err := h.DB.First(&wm).Error; err != nil {
		wm = models.GlobalWatermark{}
	}

	wm.Type = req.Type
	wm.Text = req.Text
	wm.Color = req.Color
	wm.Opacity = req.Opacity
	wm.Size = req.Size
	wm.Position = req.Position
	wm.Angle = req.Angle
	wm.Tiled = req.Tiled
	wm.ImagePath = req.ImagePath
	wm.UpdatedBy = userID
	wm.UpdatedAt = time.Now()

	if wm.ID == 0 {
		if err := h.DB.Create(&wm).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create watermark settings"})
			return
		}
	} else {
		if err := h.DB.Save(&wm).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update watermark settings"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": wm, "message": "Global watermark updated successfully"})
}

func (h *WatermarkHandler) UploadImage(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File gambar diperlukan"})
		return
	}

	ext := filepath.Ext(file.Filename)
	if ext != ".png" && ext != ".PNG" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Hanya file PNG yang diperbolehkan"})
		return
	}

	dir := filepath.Join(h.UploadPath, "watermarks")
	if err := os.MkdirAll(dir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat direktori"})
		return
	}

	filename := "watermark_" + uuid.New().String() + ".png"
	savePath := filepath.Join(dir, filename)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan file"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"image_path": savePath, "message": "Gambar berhasil diupload"})
}
