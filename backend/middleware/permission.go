package middleware

import (
	"net/http"

	"nextflow/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func RequirePermission(db *gorm.DB, moduleName, minLevel string) gin.HandlerFunc {
	levelOrder := map[string]int{
		models.AccessNone:  0,
		models.AccessView:  1,
		models.AccessEdit:  2,
		models.AccessAdmin: 3,
	}

	return func(c *gin.Context) {
		userIDVal, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		userID, ok := userIDVal.(uuid.UUID)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
			c.Abort()
			return
		}

		var perm models.Permission
		err := db.Joins("JOIN modules ON modules.id = permissions.module_id").
			Where("permissions.user_id = ? AND modules.name = ?", userID, moduleName).
			First(&perm).Error

		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			c.Abort()
			return
		}

		if levelOrder[perm.AccessLevel] < levelOrder[minLevel] {
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		c.Set("accessLevel", perm.AccessLevel)
		c.Next()
	}
}
