package handlers

import (
	"net/http"

	"nextflow/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type SearchHandler struct {
	DB *gorm.DB
}

func (h *SearchHandler) Search(c *gin.Context) {
	q := c.Query("q")
	if len(q) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Minimal 2 karakter"})
		return
	}

	like := "%" + q + "%"

	var docs []models.Document
	h.DB.Where("title ILIKE ? OR description ILIKE ? OR category ILIKE ?", like, like, like).
		Limit(10).Find(&docs)

	var tasks []models.Task
	h.DB.Preload("FromUser").Preload("ToUser").
		Where("title ILIKE ? OR description ILIKE ?", like, like).
		Limit(10).Find(&tasks)

	c.JSON(http.StatusOK, gin.H{
		"documents": docs,
		"tasks":     tasks,
	})
}
