package utils

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/smtp"
	"strings"
	"time"
)


type EmailConfig struct {
	Host string
	Port string
	User string
	Pass string
	From string
}

func SendTaskAssignedEmail(cfg EmailConfig, toEmail, toName, fromName, taskTitle, description, priority string, deadline *time.Time) error {
	if cfg.Host == "" {
		return nil // Email not configured, skip silently
	}

	deadlineStr := "Tidak ada"
	if deadline != nil {
		deadlineStr = deadline.Format("02 January 2006")
	}

	priorityLabel := map[string]string{
		"low": "Rendah", "medium": "Sedang", "high": "Tinggi",
	}[priority]
	if priorityLabel == "" {
		priorityLabel = priority
	}

	subject := taskTitle
	body := buildEmailBody(toName, fromName, taskTitle, description, priorityLabel, deadlineStr)

	return sendMail(cfg, toEmail, subject, body)
}

func buildEmailBody(toName, fromName, title, description, priority, deadline string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
    <div style="background:#2563eb;padding:24px 32px">
      <h1 style="color:#fff;margin:0;font-size:18px">%s</h1>
      <p style="color:#bfdbfe;margin:6px 0 0;font-size:13px">Ditugaskan kepada: <strong style="color:#fff">%s</strong></p>
    </div>
    <div style="padding:32px">
      <p style="color:#374151;font-size:14px;margin:0 0 20px">
        Anda mendapat pendelegasian tugas baru dari <strong>%s</strong>.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px">
        <table style="width:100%%;border-collapse:collapse">
          <tr>
            <td style="padding:10px 0;color:#6b7280;font-size:13px;width:110px;vertical-align:top">Deskripsi</td>
            <td style="padding:10px 0;color:#374151;font-size:13px">%s</td>
          </tr>
          <tr style="border-top:1px solid #f1f5f9">
            <td style="padding:10px 0;color:#6b7280;font-size:13px">Prioritas</td>
            <td style="padding:10px 0;font-size:13px;font-weight:600;color:#111827">%s</td>
          </tr>
          <tr style="border-top:1px solid #f1f5f9">
            <td style="padding:10px 0;color:#6b7280;font-size:13px">Deadline</td>
            <td style="padding:10px 0;color:#374151;font-size:13px">%s</td>
          </tr>
        </table>
      </div>
      <p style="color:#6b7280;font-size:12px;margin:0">
        Silakan login ke sistem untuk melihat detail dan mengambil tindakan.
      </p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:11px;margin:0">Email ini dikirim otomatis oleh sistem NexFlow.</p>
    </div>
  </div>
</body>
</html>`, title, toName, fromName, description, priority, deadline)
}

func sendMail(cfg EmailConfig, to, subject, htmlBody string) error {
	addr := net.JoinHostPort(cfg.Host, cfg.Port)

	headers := strings.Join([]string{
		"From: " + cfg.From,
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
	}, "\r\n")
	msg := []byte(headers + "\r\n\r\n" + htmlBody)

	var auth smtp.Auth
	if cfg.User != "" && cfg.Pass != "" {
		// Gmail / SMTP dengan credentials — gunakan STARTTLS manual
		return sendMailTLS(addr, cfg, auth, to, msg)
	}

	// Mailpit / SMTP tanpa auth — smtp.SendMail dengan nil auth
	return smtp.SendMail(addr, nil, cfg.From, []string{to}, msg)
}

func sendMailTLS(addr string, cfg EmailConfig, _ smtp.Auth, to string, msg []byte) error {
	conn, err := net.Dial("tcp", addr)
	if err != nil {
		return fmt.Errorf("dial smtp: %w", err)
	}

	client, err := smtp.NewClient(conn, cfg.Host)
	if err != nil {
		return fmt.Errorf("smtp client: %w", err)
	}
	defer client.Quit() //nolint

	if ok, _ := client.Extension("STARTTLS"); ok {
		if err = client.StartTLS(&tls.Config{ServerName: cfg.Host}); err != nil {
			return fmt.Errorf("starttls: %w", err)
		}
	}

	auth := smtp.PlainAuth("", cfg.User, cfg.Pass, cfg.Host)
	if err = client.Auth(auth); err != nil {
		return fmt.Errorf("smtp auth: %w", err)
	}

	if err = client.Mail(cfg.From); err != nil {
		return err
	}
	if err = client.Rcpt(to); err != nil {
		return err
	}

	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err = w.Write(msg); err != nil {
		return err
	}
	return w.Close()
}
