package handlers

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"nextflow/models"
	"nextflow/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ProfileHandler struct {
	DB         *gorm.DB
	UploadPath string
}

func (h *ProfileHandler) Get(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	var user models.User
	if err := h.DB.First(&user, "id = ?", userIDVal).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": user})
}

func (h *ProfileHandler) Update(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uuid.UUID)

	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	var req struct {
		Fullname    string `json:"fullname"`
		Email       string `json:"email"`
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Fullname != "" {
		updates["fullname"] = req.Fullname
	}
	if req.Email != "" {
		var existing models.User
		if err := h.DB.Where("email = ? AND id != ?", req.Email, userID).First(&existing).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{"error": "Email sudah digunakan"})
			return
		}
		updates["email"] = req.Email
	}
	if req.NewPassword != "" {
		if !utils.CheckPassword(req.OldPassword, user.Password) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Password lama tidak sesuai"})
			return
		}
		if len(req.NewPassword) < 6 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Password baru minimal 6 karakter"})
			return
		}
		hash, err := utils.HashPassword(req.NewPassword)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses password"})
			return
		}
		updates["password"] = hash
	}

	if len(updates) > 0 {
		h.DB.Model(&user).Updates(updates)
	}
	h.DB.First(&user, "id = ?", userID)
	c.JSON(http.StatusOK, gin.H{"data": user, "message": "Profil diperbarui"})
}

func (h *ProfileHandler) UploadAvatar(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uuid.UUID)

	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File tidak ditemukan"})
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Hanya JPG/PNG yang diizinkan"})
		return
	}

	dir := filepath.Join(h.UploadPath, "avatars")
	if err := os.MkdirAll(dir, 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat direktori"})
		return
	}

	filename := fmt.Sprintf("avatar-%s%s", userID.String(), ext)
	savePath := filepath.Join(dir, filename)
	if err := c.SaveUploadedFile(file, savePath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan foto"})
		return
	}

	photoURL := "/uploads/avatars/" + filename
	h.DB.Model(&models.User{}).Where("id = ?", userID).Update("photo_url", photoURL)

	c.JSON(http.StatusOK, gin.H{"photo_url": photoURL, "message": "Foto profil diperbarui"})
}
