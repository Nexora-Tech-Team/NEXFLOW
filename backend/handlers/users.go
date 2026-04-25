package handlers

import (
	"net/http"

	"nextflow/models"
	"nextflow/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserHandler struct {
	DB *gorm.DB
}

type CreateUserRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
	Fullname string `json:"fullname" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	IsActive *bool  `json:"is_active"`
}

type UpdateUserRequest struct {
	Fullname string `json:"fullname"`
	Email    string `json:"email"`
	Password string `json:"password"`
	IsActive *bool  `json:"is_active"`
}

type PermissionUpdateRequest struct {
	Permissions []struct {
		ModuleID    uint   `json:"module_id" binding:"required"`
		AccessLevel string `json:"access_level" binding:"required"`
	} `json:"permissions" binding:"required"`
}

func (h *UserHandler) ListUsers(c *gin.Context) {
	var users []models.User
	query := h.DB.Model(&models.User{})

	if search := c.Query("search"); search != "" {
		query = query.Where("username ILIKE ? OR fullname ILIKE ? OR email ILIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": users})
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var existing models.User
	if err := h.DB.Where("username = ?", req.Username).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username sudah digunakan"})
		return
	}
	if err := h.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Email sudah digunakan oleh user lain"})
		return
	}

	hash, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
		return
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	user := models.User{
		Username: req.Username,
		Password: hash,
		Fullname: req.Fullname,
		Email:    req.Email,
		IsActive: isActive,
	}

	if err := h.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": user, "message": "User created successfully"})
}

func (h *UserHandler) UpdateUser(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var user models.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Fullname != "" {
		updates["fullname"] = req.Fullname
	}
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.Password != "" {
		hash, err := utils.HashPassword(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
			return
		}
		updates["password"] = hash
	}

	if err := h.DB.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}

	h.DB.First(&user, "id = ?", id)
	c.JSON(http.StatusOK, gin.H{"data": user, "message": "User updated successfully"})
}

func (h *UserHandler) DeleteUser(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	currentUserID, _ := c.Get("userID")
	if currentUserID.(uuid.UUID) == id {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete your own account"})
		return
	}

	var user models.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	if err := h.DB.Delete(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

func (h *UserHandler) GetPermissions(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var perms []models.Permission
	if err := h.DB.Preload("Module").Where("user_id = ?", id).Find(&perms).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch permissions"})
		return
	}

	var modules []models.Module
	h.DB.Find(&modules)

	type PermMatrix struct {
		ModuleID    uint   `json:"module_id"`
		ModuleName  string `json:"module_name"`
		ModuleLabel string `json:"module_label"`
		AccessLevel string `json:"access_level"`
	}

	permMap := map[uint]string{}
	for _, p := range perms {
		permMap[p.ModuleID] = p.AccessLevel
	}

	matrix := make([]PermMatrix, len(modules))
	for i, m := range modules {
		level := models.AccessNone
		if l, ok := permMap[m.ID]; ok {
			level = l
		}
		matrix[i] = PermMatrix{
			ModuleID:    m.ID,
			ModuleName:  m.Name,
			ModuleLabel: m.Label,
			AccessLevel: level,
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": matrix})
}

func (h *UserHandler) UpdatePermissions(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var user models.User
	if err := h.DB.First(&user, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req PermissionUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	validLevels := map[string]bool{
		models.AccessNone: true, models.AccessView: true,
		models.AccessEdit: true, models.AccessAdmin: true,
	}

	for _, p := range req.Permissions {
		if !validLevels[p.AccessLevel] {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid access level: " + p.AccessLevel})
			return
		}

		var perm models.Permission
		result := h.DB.Where("user_id = ? AND module_id = ?", id, p.ModuleID).First(&perm)
		if result.Error == gorm.ErrRecordNotFound {
			perm = models.Permission{UserID: id, ModuleID: p.ModuleID, AccessLevel: p.AccessLevel}
			h.DB.Create(&perm)
		} else {
			h.DB.Model(&perm).Update("access_level", p.AccessLevel)
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Permissions updated successfully"})
}
