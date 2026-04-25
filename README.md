# NextFlow — e-Doc Web Document Center
**PT Tolan Tiga Indonesia (SIPEF)**

## Deskripsi
NextFlow adalah aplikasi web terpusat untuk manajemen dokumen (eDoc) dan delegasi tugas (eMemo) internal PT Tolan Tiga Indonesia.

---

## Tech Stack
| Layer | Teknologi |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + TailwindCSS |
| Backend | Golang + Gin Framework + GORM |
| Database | PostgreSQL 15 |
| DevOps | Docker + Docker Compose |

---

## Prasyarat
- **Docker Desktop for Windows** (sudah terinstall dan berjalan)
- Git (opsional)
- Port berikut harus tersedia: `3000`, `8080`, `5432`

---

## Cara Menjalankan

### 1. Buka Terminal / PowerShell
```powershell
cd "C:\projects\Next Flow"
```

### 2. Pastikan file .env ada
File `.env` sudah tersedia. Jika tidak ada, buat dari template:
```powershell
copy .env.example .env
```

### 3. Build & Jalankan semua service
```bash
docker-compose up --build
```
> Proses build pertama kali membutuhkan waktu 5-10 menit (unduh dependencies Go & Node.js)

### 4. Tunggu hingga semua service siap
Anda akan melihat log seperti:
```
nextflow_backend  | NextFlow API server starting on :8080
nextflow_backend  | Seeding completed
nextflow_frontend | nginx: ready
```

### 5. Buka Browser
```
http://localhost:3000
```

---

## Akun Login (Default)

| Username | Password | Akses |
|----------|----------|-------|
| `admin` | `admin123` | Admin penuh (eDoc + eMemo) |
| `fahrizal` | `fahrizal123` | eDoc Edit, eMemo View |
| `arya` | `arya123` | eDoc View, eMemo Edit |

---

## Struktur Folder
```
Next Flow/
├── frontend/               React + Vite app
│   ├── src/
│   │   ├── pages/         Halaman aplikasi
│   │   │   ├── edoc/      Browse, Detail, Watermark, Monitoring
│   │   │   └── ememo/     OrgChart, TaskList, TaskMonitoring
│   │   ├── components/    UI komponen reusable
│   │   ├── context/       Auth & Notif context
│   │   ├── hooks/         useAuth, usePermission
│   │   └── api/           Axios API clients
│   └── Dockerfile
│
├── backend/                Golang API
│   ├── main.go
│   ├── config/            Konfigurasi env
│   ├── database/          Koneksi + seeder
│   ├── models/            GORM models
│   ├── handlers/          Request handlers
│   ├── middleware/        Auth, CORS, Permission
│   ├── routes/            Route registration
│   ├── utils/             JWT, password, watermark
│   └── Dockerfile
│
├── docker-compose.yml
├── .env
└── README.md
```

---

## API Endpoints
| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | `/api/auth/login` | Login, return JWT |
| GET | `/api/auth/me` | Info user saat ini |
| GET | `/api/documents` | List dokumen |
| POST | `/api/documents` | Upload dokumen |
| GET | `/api/documents/:id/download` | Download dengan watermark |
| GET | `/api/documents/:id/preview` | Preview dokumen |
| GET | `/api/watermark/global` | Pengaturan watermark global |
| GET | `/api/tasks` | List tugas |
| POST | `/api/tasks` | Buat tugas |
| GET | `/api/ou` | Struktur organisasi |
| GET | `/api/monitoring/summary` | Statistik sistem |
| GET | `/api/activity-log` | Log aktivitas (admin) |

---

## Perintah Berguna

### Hentikan semua service
```bash
docker-compose down
```

### Hentikan & hapus data (reset database)
```bash
docker-compose down -v
```

### Lihat log backend
```bash
docker-compose logs -f backend
```

### Rebuild hanya frontend
```bash
docker-compose up --build frontend
```

### Akses database PostgreSQL
```bash
docker exec -it nextflow_postgres psql -U nextflow_user -d nextflow_db
```

---

## Fitur Utama

### eDoc - Document Center
- Browse & cari dokumen berdasarkan kategori, sub-kategori, area, keyword
- Upload dokumen (PDF, Word, Excel, dll.) max 50MB
- Preview PDF langsung di browser (PDF.js)
- Download dokumen dengan watermark otomatis
- Watermark global (teks, warna, opacity, ukuran, sudut, posisi)
- Watermark per-dokumen (override global)
- Komentar & rating dokumen (1-4 bintang)
- Monitoring: statistik, activity log, breakdown per kategori

### eMemo - Task & Organization
- Bagan organisasi hierarkis dengan CRUD
- Delegasi tugas dengan prioritas (Low/Medium/High)
- Status workflow: Draft → Assigned → In Progress → Done/Rejected
- Komentar pada tugas
- Monitoring tugas per pengguna dengan progress bar

### Admin
- User management (CRUD user)
- Permission matrix per modul (none/view/edit/admin)
- Activity log lengkap dengan filter

---

## Permission Matrix
| Level | eDoc | eMemo |
|-------|------|-------|
| `none` | Modul tersembunyi | Modul tersembunyi |
| `view` | Lihat & browse dokumen | Lihat tugas & orgchart |
| `edit` | View + upload, download, komentar | View + buat tugas, update status |
| `admin` | Edit + hapus, watermark global, monitoring, user mgmt | Edit + monitoring tugas |

---

## Troubleshooting

**Backend gagal connect ke database:**
```bash
# Tunggu ~30 detik, lalu:
docker-compose restart backend
```

**Port sudah digunakan:**
```bash
# Edit docker-compose.yml, ganti port
# Contoh: "3001:80" untuk frontend
```

**Build gagal karena dependencies Go:**
```bash
docker-compose build --no-cache backend
```

**Reset database (mulai fresh):**
```bash
docker-compose down -v
docker-compose up --build
```

---

## Environment Variables (.env)
```env
POSTGRES_DB=nextflow_db
POSTGRES_USER=nextflow_user
POSTGRES_PASSWORD=nextflow_pass
JWT_SECRET=nextflow_jwt_secret_2024
UPLOAD_PATH=/app/uploads
GIN_MODE=debug
VITE_API_URL=http://localhost:8080
```

---

© 2024 PT Tolan Tiga Indonesia · NextFlow v1.0
