package config

import "os"

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	JWTSecret  string
	UploadPath string
	GinMode    string
	SMTPHost   string
	SMTPPort   string
	SMTPUser   string
	SMTPPass   string
	SMTPFrom   string
}

func Load() *Config {
	return &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "nextflow_user"),
		DBPassword: getEnv("DB_PASSWORD", "nextflow_pass"),
		DBName:     getEnv("DB_NAME", "nextflow_db"),
		JWTSecret:  getEnv("JWT_SECRET", "nextflow_jwt_secret_2024"),
		UploadPath: getEnv("UPLOAD_PATH", "./uploads"),
		GinMode:    getEnv("GIN_MODE", "debug"),
		SMTPHost:   getEnv("SMTP_HOST", ""),
		SMTPPort:   getEnv("SMTP_PORT", "587"),
		SMTPUser:   getEnv("SMTP_USER", ""),
		SMTPPass:   getEnv("SMTP_PASS", ""),
		SMTPFrom:   getEnv("SMTP_FROM", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
