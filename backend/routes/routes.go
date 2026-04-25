package routes

import (
	"net/http"

	"nextflow/config"
	"nextflow/handlers"
	"nextflow/middleware"
	"nextflow/models"
	"nextflow/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Setup(r *gin.Engine, db *gorm.DB, cfg *config.Config) {
	r.Use(middleware.CORSMiddleware())

	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok", "app": "NexFlow"})
	})

	// Serve uploaded files (avatars, etc.)
	r.Static("/uploads", cfg.UploadPath)

	authHandler := &handlers.AuthHandler{DB: db, JWTSecret: cfg.JWTSecret}
	userHandler := &handlers.UserHandler{DB: db}
	profileHandler := &handlers.ProfileHandler{DB: db, UploadPath: cfg.UploadPath}
	searchHandler := &handlers.SearchHandler{DB: db}
	docHandler := &handlers.DocumentHandler{DB: db, UploadPath: cfg.UploadPath}
	wmHandler := &handlers.WatermarkHandler{DB: db, UploadPath: cfg.UploadPath}
	logHandler := &handlers.ActivityLogHandler{DB: db}
	ouHandler := &handlers.OUHandler{DB: db}
	taskHandler := &handlers.TaskHandler{
		DB:         db,
		UploadPath: cfg.UploadPath,
		EmailConfig: utils.EmailConfig{
			Host: cfg.SMTPHost, Port: cfg.SMTPPort,
			User: cfg.SMTPUser, Pass: cfg.SMTPPass, From: cfg.SMTPFrom,
		},
	}
	attachHandler := &handlers.TaskAttachmentHandler{DB: db, UploadPath: cfg.UploadPath}
	monitorHandler := &handlers.MonitoringHandler{DB: db}
	notifHandler := &handlers.NotificationHandler{DB: db}

	api := r.Group("/api")

	// Auth routes
	auth := api.Group("/auth")
	{
		auth.POST("/login", authHandler.Login)
		auth.POST("/logout", middleware.AuthMiddleware(cfg.JWTSecret), authHandler.Logout)
		auth.GET("/me", middleware.AuthMiddleware(cfg.JWTSecret), authHandler.Me)
	}

	// Protected routes
	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	{
		// Modules
		protected.GET("/modules", docHandler.GetModules)
		protected.GET("/documents/categories", docHandler.GetCategories)

		// User management (admin only)
		users := protected.Group("/users")
		users.Use(middleware.RequirePermission(db, "edoc", models.AccessAdmin))
		{
			users.GET("", userHandler.ListUsers)
			users.POST("", userHandler.CreateUser)
			users.PUT("/:id", userHandler.UpdateUser)
			users.DELETE("/:id", userHandler.DeleteUser)
			users.GET("/:id/permissions", userHandler.GetPermissions)
			users.PUT("/:id/permissions", userHandler.UpdatePermissions)
		}

		// Documents
		docs := protected.Group("/documents")
		{
			docs.GET("", middleware.RequirePermission(db, "edoc", models.AccessView), docHandler.ListDocuments)
			docs.POST("", middleware.RequirePermission(db, "edoc", models.AccessEdit), docHandler.UploadDocument)
			docs.GET("/:id", middleware.RequirePermission(db, "edoc", models.AccessView), docHandler.GetDocument)
			docs.PUT("/:id", middleware.RequirePermission(db, "edoc", models.AccessEdit), docHandler.UpdateDocument)
			docs.DELETE("/:id", middleware.RequirePermission(db, "edoc", models.AccessAdmin), docHandler.DeleteDocument)
			docs.GET("/:id/download", middleware.RequirePermission(db, "edoc", models.AccessEdit), docHandler.DownloadDocument)
			docs.GET("/:id/preview", middleware.RequirePermission(db, "edoc", models.AccessView), docHandler.PreviewDocument)
			docs.POST("/:id/comments", middleware.RequirePermission(db, "edoc", models.AccessEdit), docHandler.AddComment)
			docs.GET("/:id/comments", middleware.RequirePermission(db, "edoc", models.AccessView), docHandler.ListComments)
		}

		// Watermark
		wm := protected.Group("/watermark")
		{
			wm.GET("/global", middleware.RequirePermission(db, "edoc", models.AccessView), wmHandler.GetGlobal)
			wm.PUT("/global", middleware.RequirePermission(db, "edoc", models.AccessAdmin), wmHandler.UpdateGlobal)
			wm.POST("/upload-image", middleware.RequirePermission(db, "edoc", models.AccessAdmin), wmHandler.UploadImage)
		}

		// Profile
		protected.GET("/profile", profileHandler.Get)
		protected.PUT("/profile", profileHandler.Update)
		protected.POST("/profile/avatar", profileHandler.UploadAvatar)

		// Global search
		protected.GET("/search", searchHandler.Search)

		// Dashboard stats (all authenticated users)
		protected.GET("/stats", monitorHandler.PublicStats)

		// Activity log (admin only)
		protected.GET("/activity-log",
			middleware.RequirePermission(db, "edoc", models.AccessAdmin),
			logHandler.ListActivityLogs)
		protected.GET("/activity-log/export",
			middleware.RequirePermission(db, "edoc", models.AccessAdmin),
			logHandler.ExportCSV)

		// Organization Units
		ou := protected.Group("/ou")
		{
			ou.GET("", middleware.RequirePermission(db, "ememo", models.AccessView), ouHandler.GetTree)
			ou.POST("", middleware.RequirePermission(db, "ememo", models.AccessEdit), ouHandler.Create)
			ou.PUT("/:id", middleware.RequirePermission(db, "ememo", models.AccessEdit), ouHandler.Update)
			ou.DELETE("/:id", middleware.RequirePermission(db, "ememo", models.AccessAdmin), ouHandler.Delete)
		}

		// Tasks
		tasks := protected.Group("/tasks")
		{
			tasks.GET("", middleware.RequirePermission(db, "ememo", models.AccessView), taskHandler.ListTasks)
			tasks.GET("/export", middleware.RequirePermission(db, "ememo", models.AccessView), taskHandler.ExportCSV)
			tasks.POST("", middleware.RequirePermission(db, "ememo", models.AccessEdit), taskHandler.CreateTask)
			tasks.GET("/:id", middleware.RequirePermission(db, "ememo", models.AccessView), taskHandler.GetTask)
			tasks.PUT("/:id", middleware.RequirePermission(db, "ememo", models.AccessEdit), taskHandler.UpdateTask)
			tasks.PUT("/:id/status", middleware.RequirePermission(db, "ememo", models.AccessEdit), taskHandler.UpdateTaskStatus)
			tasks.PUT("/:id/progress", middleware.RequirePermission(db, "ememo", models.AccessEdit), taskHandler.UpdateProgress)
			tasks.GET("/:id/history", middleware.RequirePermission(db, "ememo", models.AccessView), taskHandler.GetHistory)
			tasks.POST("/:id/comments", middleware.RequirePermission(db, "ememo", models.AccessEdit), taskHandler.AddComment)
			tasks.GET("/:id/comments", middleware.RequirePermission(db, "ememo", models.AccessView), taskHandler.ListComments)
			tasks.POST("/:id/attachments", middleware.RequirePermission(db, "ememo", models.AccessEdit), attachHandler.Upload)
			tasks.GET("/:id/attachments", middleware.RequirePermission(db, "ememo", models.AccessView), attachHandler.List)
			tasks.GET("/:id/attachments/:aid/download", middleware.RequirePermission(db, "ememo", models.AccessView), attachHandler.Download)
			tasks.DELETE("/:id/attachments/:aid", middleware.RequirePermission(db, "ememo", models.AccessEdit), attachHandler.Delete)
		}

		// Notifications
		notifs := protected.Group("/notifications")
		{
			notifs.GET("", notifHandler.List)
			notifs.PUT("/:id/read", notifHandler.MarkRead)
			notifs.PUT("/read-all", notifHandler.MarkAllRead)
		}

		// Monitoring (admin only)
		monitoring := protected.Group("/monitoring")
		monitoring.Use(middleware.RequirePermission(db, "edoc", models.AccessAdmin))
		{
			monitoring.GET("/summary", monitorHandler.Summary)
			monitoring.GET("/activity", monitorHandler.ActivityTable)
			monitoring.GET("/tasks", monitorHandler.TaskSummary)
		}
	}
}
