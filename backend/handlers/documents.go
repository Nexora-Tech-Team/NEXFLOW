package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"nextflow/models"
	"nextflow/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type DocumentHandler struct {
	DB         *gorm.DB
	UploadPath string
}

func (h *DocumentHandler) ListDocuments(c *gin.Context) {
	var docs []models.Document
	query := h.DB.Preload("Uploader")

	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}
	if keyword := c.Query("keyword"); keyword != "" {
		query = query.Where("title ILIKE ? OR description ILIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}
	if subCat := c.Query("sub_category"); subCat != "" {
		query = query.Where("sub_category = ?", subCat)
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	var total int64
	query.Model(&models.Document{}).Count(&total)

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&docs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch documents"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  docs,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

func (h *DocumentHandler) UploadDocument(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uuid.UUID)

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File is required"})
		return
	}
	defer file.Close()

	if header.Size > 50*1024*1024 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size exceeds 50MB limit"})
		return
	}

	ext := filepath.Ext(header.Filename)
	newFileName := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	filePath := filepath.Join(h.UploadPath, newFileName)

	if err := os.MkdirAll(h.UploadPath, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create upload directory"})
		return
	}

	out, err := os.Create(filePath)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}
	defer out.Close()

	buf := make([]byte, 32*1024)
	for {
		n, err := file.Read(buf)
		if n > 0 {
			out.Write(buf[:n])
		}
		if err != nil {
			break
		}
	}

	useGlobal := true
	if val := c.PostForm("use_global_watermark"); val == "false" {
		useGlobal = false
	}

	wmOpacity, _ := strconv.ParseFloat(c.PostForm("watermark_opacity"), 64)
	wmSize, _ := strconv.ParseFloat(c.PostForm("watermark_size"), 64)
	wmAngle, _ := strconv.ParseFloat(c.PostForm("watermark_angle"), 64)

	doc := models.Document{
		Title:              c.PostForm("title"),
		Category:           c.PostForm("category"),
		SubCategory:        c.PostForm("sub_category"),
		Area:               c.PostForm("area"),
		Description:        c.PostForm("description"),
		FilePath:           filePath,
		FileName:           header.Filename,
		FileSize:           header.Size,
		UploadedBy:         userID,
		Status:             "active",
		UseGlobalWatermark: useGlobal,
		WatermarkText:      c.PostForm("watermark_text"),
		WatermarkColor:     c.PostForm("watermark_color"),
		WatermarkOpacity:   wmOpacity,
		WatermarkSize:      wmSize,
		WatermarkPosition:  c.PostForm("watermark_position"),
		WatermarkAngle:     wmAngle,
	}

	if doc.Title == "" {
		doc.Title = header.Filename
	}

	if err := h.DB.Create(&doc).Error; err != nil {
		os.Remove(filePath)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save document"})
		return
	}

	logActivity(h.DB, userID, "upload", &doc.ID, "Uploaded document: "+doc.Title, c.ClientIP())
	c.JSON(http.StatusCreated, gin.H{"data": doc, "message": "Document uploaded successfully"})
}

func (h *DocumentHandler) GetDocument(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	var doc models.Document
	if err := h.DB.Preload("Uploader").First(&doc, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uuid.UUID)
	logActivity(h.DB, userID, "view", &id, "Viewed document: "+doc.Title, c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"data": doc})
}

func (h *DocumentHandler) UpdateDocument(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	var doc models.Document
	if err := h.DB.First(&doc, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	var req struct {
		Title              string     `json:"title"`
		Category           string     `json:"category"`
		SubCategory        string     `json:"sub_category"`
		Area               string     `json:"area"`
		Description        string     `json:"description"`
		Status             string     `json:"status"`
		UseGlobalWatermark *bool      `json:"use_global_watermark"`
		WatermarkText      string     `json:"watermark_text"`
		WatermarkColor     string     `json:"watermark_color"`
		WatermarkOpacity   float64    `json:"watermark_opacity"`
		WatermarkSize      float64    `json:"watermark_size"`
		WatermarkPosition  string     `json:"watermark_position"`
		WatermarkAngle     float64    `json:"watermark_angle"`
		MaxPrint           *int       `json:"max_print"`
		AllowPreview       *bool      `json:"allow_preview"`
		ExpiryDate         *time.Time `json:"expiry_date"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Category != "" {
		updates["category"] = req.Category
	}
	if req.SubCategory != "" {
		updates["sub_category"] = req.SubCategory
	}
	if req.Area != "" {
		updates["area"] = req.Area
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.UseGlobalWatermark != nil {
		updates["use_global_watermark"] = *req.UseGlobalWatermark
	}
	if req.WatermarkText != "" {
		updates["watermark_text"] = req.WatermarkText
	}
	if req.WatermarkColor != "" {
		updates["watermark_color"] = req.WatermarkColor
	}
	if req.WatermarkOpacity > 0 {
		updates["watermark_opacity"] = req.WatermarkOpacity
	}
	if req.WatermarkSize > 0 {
		updates["watermark_size"] = req.WatermarkSize
	}
	if req.WatermarkPosition != "" {
		updates["watermark_position"] = req.WatermarkPosition
	}
	if req.WatermarkAngle != 0 {
		updates["watermark_angle"] = req.WatermarkAngle
	}
	if req.MaxPrint != nil {
		updates["max_print"] = *req.MaxPrint
	}
	if req.AllowPreview != nil {
		updates["allow_preview"] = *req.AllowPreview
	}
	if req.ExpiryDate != nil {
		updates["expiry_date"] = req.ExpiryDate
	}

	if err := h.DB.Model(&doc).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update document"})
		return
	}

	userIDVal, _ := c.Get("userID")
	logActivity(h.DB, userIDVal.(uuid.UUID), "edit", &id, "Updated document: "+doc.Title, c.ClientIP())

	h.DB.Preload("Uploader").First(&doc, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"data": doc, "message": "Document updated successfully"})
}

func (h *DocumentHandler) DeleteDocument(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	var doc models.Document
	if err := h.DB.First(&doc, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	if err := h.DB.Delete(&doc).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete document"})
		return
	}

	userIDVal, _ := c.Get("userID")
	logActivity(h.DB, userIDVal.(uuid.UUID), "delete", &id, "Deleted document: "+doc.Title, c.ClientIP())

	c.JSON(http.StatusOK, gin.H{"message": "Document deleted successfully"})
}

func (h *DocumentHandler) DownloadDocument(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	var doc models.Document
	if err := h.DB.First(&doc, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	if doc.FilePath == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	var wmConfig utils.WatermarkConfig
	if doc.UseGlobalWatermark {
		var gw models.GlobalWatermark
		if err := h.DB.First(&gw).Error; err == nil {
			wmConfig = utils.WatermarkConfig{
				Type:      gw.Type,
				Text:      gw.Text,
				Color:     gw.Color,
				Opacity:   gw.Opacity,
				Size:      gw.Size,
				Position:  gw.Position,
				Angle:     gw.Angle,
				Tiled:     gw.Tiled,
				ImagePath: gw.ImagePath,
			}
		}
	} else {
		wmConfig = utils.WatermarkConfig{
			Text:     doc.WatermarkText,
			Color:    doc.WatermarkColor,
			Opacity:  doc.WatermarkOpacity,
			Size:     doc.WatermarkSize,
			Position: doc.WatermarkPosition,
			Angle:    doc.WatermarkAngle,
		}
	}

	ext := filepath.Ext(doc.FileName)
	userIDVal, _ := c.Get("userID")
	logActivity(h.DB, userIDVal.(uuid.UUID), "download", &id, "Downloaded document: "+doc.Title, c.ClientIP())

	if ext == ".pdf" && (wmConfig.Text != "" || (wmConfig.Type == "image" && wmConfig.ImagePath != "")) {
		data, err := utils.ApplyWatermark(doc.FilePath, wmConfig)
		if err == nil {
			c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, doc.FileName))
			c.Header("Content-Type", "application/pdf")
			c.Header("Content-Length", strconv.Itoa(len(data)))
			c.Data(http.StatusOK, "application/pdf", data)
			return
		}
	}

	c.Header("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, doc.FileName))
	c.File(doc.FilePath)
}

func (h *DocumentHandler) PreviewDocument(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	var doc models.Document
	if err := h.DB.First(&doc, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	if doc.FilePath == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found"})
		return
	}

	if !doc.AllowPreview {
		c.JSON(http.StatusForbidden, gin.H{"error": "Preview tidak diizinkan untuk dokumen ini"})
		return
	}

	if doc.ExpiryDate != nil && time.Now().After(*doc.ExpiryDate) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akses dokumen ini telah kedaluwarsa"})
		return
	}

	ext := filepath.Ext(doc.FileName)
	contentType := "application/octet-stream"
	switch ext {
	case ".pdf":
		contentType = "application/pdf"
	case ".jpg", ".jpeg":
		contentType = "image/jpeg"
	case ".png":
		contentType = "image/png"
	}

	c.Header("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, doc.FileName))
	c.Header("Content-Type", contentType)
	c.File(doc.FilePath)
}

func (h *DocumentHandler) AddComment(c *gin.Context) {
	docID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uuid.UUID)

	var req struct {
		Rating int    `json:"rating" binding:"required,min=1,max=4"`
		Text   string `json:"text"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	comment := models.Comment{
		DocumentID: docID,
		UserID:     userID,
		Rating:     req.Rating,
		Text:       req.Text,
	}

	if err := h.DB.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add comment"})
		return
	}

	h.DB.Preload("User").First(&comment, "id = ?", comment.ID)
	c.JSON(http.StatusCreated, gin.H{"data": comment})
}

func (h *DocumentHandler) ListComments(c *gin.Context) {
	docID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	var comments []models.Comment
	if err := h.DB.Preload("User").
		Where("document_id = ?", docID).
		Order("created_at DESC").
		Find(&comments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch comments"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": comments})
}

func (h *DocumentHandler) GetModules(c *gin.Context) {
	var modules []models.Module
	if err := h.DB.Order("\"order\" ASC").Find(&modules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch modules"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": modules})
}

func (h *DocumentHandler) GetCategories(c *gin.Context) {
	var categories []struct {
		Category    string
		SubCategory string
	}
	h.DB.Table("documents").
		Select("DISTINCT category, sub_category").
		Where("deleted_at IS NULL").
		Order("category, sub_category").
		Scan(&categories)

	catMap := map[string][]string{}
	catOrder := []string{}
	for _, c := range categories {
		if c.Category != "" {
			if _, exists := catMap[c.Category]; !exists {
				catOrder = append(catOrder, c.Category)
				catMap[c.Category] = []string{}
			}
			catMap[c.Category] = append(catMap[c.Category], c.SubCategory)
		}
	}

	type CatItem struct {
		Name          string   `json:"name"`
		SubCategories []string `json:"sub_categories"`
	}

	result := make([]CatItem, 0, len(catOrder))
	for _, name := range catOrder {
		result = append(result, CatItem{Name: name, SubCategories: catMap[name]})
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

func (h *DocumentHandler) GetPrintQuota(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	var doc models.Document
	if err := h.DB.First(&doc, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uuid.UUID)

	var up models.DocumentUserPrint
	h.DB.Where("user_id = ? AND document_id = ?", userID, id).First(&up)

	remaining := -1 // -1 = unlimited
	if doc.MaxPrint > 0 {
		remaining = doc.MaxPrint - up.PrintCount
		if remaining < 0 {
			remaining = 0
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"max_print":   doc.MaxPrint,
		"print_count": up.PrintCount,
		"remaining":   remaining,
	})
}

func (h *DocumentHandler) PrintDocument(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	var doc models.Document
	if err := h.DB.First(&doc, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	if doc.ExpiryDate != nil && time.Now().After(*doc.ExpiryDate) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akses dokumen ini telah kedaluwarsa"})
		return
	}

	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uuid.UUID)

	if doc.MaxPrint > 0 {
		// Atomic upsert + increment hanya jika print_count < max_print
		result := h.DB.Exec(`
			INSERT INTO document_user_prints (user_id, document_id, print_count, updated_at)
			VALUES (?, ?, 1, NOW())
			ON CONFLICT (user_id, document_id)
			DO UPDATE SET print_count = document_user_prints.print_count + 1, updated_at = NOW()
			WHERE document_user_prints.print_count < ?
		`, userID, id, doc.MaxPrint)

		if result.RowsAffected == 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "Kuota cetak dokumen ini telah habis"})
			return
		}
	}

	logActivity(h.DB, userID, "print", &id, "Printed document: "+doc.Title, c.ClientIP())

	c.Header("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, doc.FileName))
	c.Header("Content-Type", "application/pdf")
	c.Header("Cache-Control", "no-store")
	c.File(doc.FilePath)
}

// helper to avoid undefined at compile time
var _ = time.Now
