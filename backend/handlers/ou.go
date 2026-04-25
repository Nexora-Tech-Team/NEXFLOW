package handlers

import (
	"net/http"

	"nextflow/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type OUHandler struct {
	DB *gorm.DB
}

func (h *OUHandler) GetTree(c *gin.Context) {
	var roots []models.OUUnit
	h.DB.Preload("AssignedUser").Where("parent_id IS NULL").Order("\"order\" ASC").Find(&roots)

	for i := range roots {
		h.loadChildren(h.DB, &roots[i])
	}

	c.JSON(http.StatusOK, gin.H{"data": roots})
}

func (h *OUHandler) loadChildren(db *gorm.DB, unit *models.OUUnit) {
	db.Preload("AssignedUser").Where("parent_id = ?", unit.ID).Order("\"order\" ASC").Find(&unit.Children)
	for i := range unit.Children {
		h.loadChildren(db, &unit.Children[i])
	}
}

func (h *OUHandler) Create(c *gin.Context) {
	var req struct {
		Name           string     `json:"name" binding:"required"`
		ParentID       *uuid.UUID `json:"parent_id"`
		AssignedUserID *uuid.UUID `json:"assigned_user_id"`
		Order          int        `json:"order"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	unit := models.OUUnit{
		Name:           req.Name,
		ParentID:       req.ParentID,
		AssignedUserID: req.AssignedUserID,
		Order:          req.Order,
	}

	if err := h.DB.Create(&unit).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create OU unit"})
		return
	}

	h.DB.Preload("AssignedUser").First(&unit, "id = ?", unit.ID)
	c.JSON(http.StatusCreated, gin.H{"data": unit})
}

func (h *OUHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid OU unit ID"})
		return
	}

	var unit models.OUUnit
	if err := h.DB.First(&unit, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "OU unit not found"})
		return
	}

	var req struct {
		Name           string     `json:"name"`
		ParentID       *uuid.UUID `json:"parent_id"`
		AssignedUserID *uuid.UUID `json:"assigned_user_id"`
		Order          int        `json:"order"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	updates["parent_id"] = req.ParentID
	updates["assigned_user_id"] = req.AssignedUserID
	if req.Order != 0 {
		updates["order"] = req.Order
	}

	if err := h.DB.Model(&unit).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update OU unit"})
		return
	}

	h.DB.Preload("AssignedUser").First(&unit, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"data": unit})
}

func (h *OUHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid OU unit ID"})
		return
	}

	var unit models.OUUnit
	if err := h.DB.First(&unit, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "OU unit not found"})
		return
	}

	// Unset parent for children
	h.DB.Model(&models.OUUnit{}).Where("parent_id = ?", id).Update("parent_id", nil)

	if err := h.DB.Delete(&unit).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete OU unit"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "OU unit deleted successfully"})
}
