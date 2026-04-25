package utils

import (
	"log"
	"nextflow/models"
	"time"

	"gorm.io/gorm"
)

func StartDeadlineReminder(db *gorm.DB, emailCfg EmailConfig) {
	go func() {
		// Tunggu sebentar saat startup
		time.Sleep(10 * time.Second)
		runReminder(db, emailCfg)

		// Jalankan setiap 24 jam
		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()
		for range ticker.C {
			runReminder(db, emailCfg)
		}
	}()
}

func runReminder(db *gorm.DB, emailCfg EmailConfig) {
	tomorrow := time.Now().Add(24 * time.Hour)
	start := time.Date(tomorrow.Year(), tomorrow.Month(), tomorrow.Day(), 0, 0, 0, 0, tomorrow.Location())
	end := start.Add(24 * time.Hour)

	var tasks []models.Task
	db.Preload("ToUser").Preload("FromUser").
		Where("deadline >= ? AND deadline < ?", start, end).
		Where("status NOT IN ?", []string{models.TaskStatusDone, models.TaskStatusRejected}).
		Find(&tasks)

	for _, task := range tasks {
		if task.ToUser.Email == "" {
			continue
		}
		err := SendDeadlineReminderEmail(emailCfg, task.ToUser.Email, task.ToUser.Fullname,
			task.Title, task.Description, task.Priority, task.Deadline)
		if err != nil {
			log.Printf("[REMINDER] Gagal kirim reminder ke %s: %v", task.ToUser.Email, err)
		} else {
			log.Printf("[REMINDER] Reminder deadline terkirim ke %s", task.ToUser.Email)
		}
	}
}

func SendDeadlineReminderEmail(cfg EmailConfig, toEmail, toName, taskTitle, description, priority string, deadline *time.Time) error {
	if cfg.Host == "" {
		return nil
	}

	deadlineStr := ""
	if deadline != nil {
		deadlineStr = deadline.Format("02 January 2006")
	}

	priorityLabel := map[string]string{"low": "Rendah", "medium": "Sedang", "high": "Tinggi"}[priority]
	if priorityLabel == "" {
		priorityLabel = priority
	}

	subject := "[Reminder] Deadline Besok: " + taskTitle
	body := buildReminderBody(toName, taskTitle, description, priorityLabel, deadlineStr)

	return sendMail(cfg, toEmail, subject, body)
}

func buildReminderBody(toName, title, description, priority, deadline string) string {
	return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
    <div style="background:#f59e0b;padding:24px 32px">
      <h1 style="color:#fff;margin:0;font-size:18px">⏰ Pengingat Deadline</h1>
      <p style="color:#fef3c7;margin:6px 0 0;font-size:13px">Deadline tugas Anda adalah besok</p>
    </div>
    <div style="padding:32px">
      <p style="color:#374151;font-size:14px;margin:0 0 20px">Halo <strong>` + toName + `</strong>,</p>
      <p style="color:#374151;font-size:14px;margin:0 0 20px">
        Tugas berikut memiliki deadline <strong>besok</strong>. Pastikan Anda sudah menyelesaikannya.
      </p>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:20px;margin-bottom:24px">
        <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#111827">` + title + `</p>
        <table style="width:100%;border-collapse:collapse">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;width:110px">Deskripsi</td>
            <td style="padding:6px 0;color:#374151;font-size:13px">` + description + `</td>
          </tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Prioritas</td>
            <td style="padding:6px 0;font-size:13px;font-weight:600">` + priority + `</td>
          </tr>
          <tr><td style="padding:6px 0;color:#6b7280;font-size:13px">Deadline</td>
            <td style="padding:6px 0;color:#dc2626;font-size:13px;font-weight:600">` + deadline + `</td>
          </tr>
        </table>
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:11px;margin:0">Email ini dikirim otomatis oleh sistem NexFlow.</p>
    </div>
  </div>
</body></html>`
}
