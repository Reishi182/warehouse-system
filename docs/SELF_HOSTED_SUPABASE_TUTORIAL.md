# 🚀 Tutorial Lengkap: Self-Hosted Supabase untuk Warehouse System

Tutorial ini akan memandu Anda dari nol untuk memindahkan Supabase dari cloud ke VPS sendiri.

---

## 📋 Daftar Isi

1. [Persiapan & Requirements](#1-persiapan--requirements)
2. [Sewa VPS](#2-sewa-vps)
3. [Login ke VPS](#3-login-ke-vps)
4. [Install Docker](#4-install-docker)
5. [Install Supabase](#5-install-supabase)
6. [Konfigurasi Supabase](#6-konfigurasi-supabase)
7. [Jalankan Supabase](#7-jalankan-supabase)
8. [Migrasi Database](#8-migrasi-database)
9. [Update Aplikasi Warehouse](#9-update-aplikasi-warehouse)
10. [Setup Domain & SSL (Opsional)](#10-setup-domain--ssl-opsional)
11. [Backup & Maintenance](#11-backup--maintenance)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Persiapan & Requirements

### Yang Anda Butuhkan:

| Item | Keterangan | Status |
|------|------------|--------|
| VPS | Server dengan min 4GB RAM | ⬜ |
| Domain (opsional) | Untuk HTTPS | ⬜ |
| Komputer/Laptop | Untuk remote ke VPS | ✅ |
| Koneksi Internet | Stabil | ✅ |

### Spesifikasi VPS yang Disarankan:

| Spec | Minimum | Recommended |
|------|---------|-------------|
| RAM | 4 GB | 8 GB |
| CPU | 2 vCPU | 4 vCPU |
| Storage | 40 GB SSD | 80+ GB SSD |
| OS | Ubuntu 22.04 | Ubuntu 22.04 |
| Lokasi | Singapore | Singapore |

### Estimasi Biaya Bulanan:

| Provider | Spec | Harga |
|----------|------|-------|
| Hostinger KVM 2 | 8GB RAM, 100GB | ~Rp 120.000/bulan |
| Hetzner CAX21 | 8GB RAM, 80GB | ~Rp 130.000/bulan |
| Contabo VPS M | 16GB RAM, 400GB | ~Rp 155.000/bulan |

---

## 2. Sewa VPS

### Opsi A: Hostinger (Recommended untuk Indonesia)

1. Buka **https://www.hostinger.co.id/vps-hosting**
2. Pilih paket **KVM 2** (8GB RAM, 100GB)
3. Pilih lokasi: **Singapore**
4. Pilih OS: **Ubuntu 22.04 64bit**
5. Buat password root yang kuat
6. Selesaikan pembayaran
7. Tunggu email dengan detail VPS:
   - **IP Address**: xxx.xxx.xxx.xxx
   - **Username**: root
   - **Password**: (yang Anda buat)

### Opsi B: Hetzner (Lebih Murah)

1. Buka **https://www.hetzner.com/cloud**
2. Buat akun
3. Pilih **CAX21** (ARM, lebih murah) atau **CX22** (Intel)
4. Pilih lokasi terdekat (Jerman)
5. Pilih OS: **Ubuntu 22.04**
6. Tambahkan SSH key atau gunakan password
7. Deploy server

---

## 3. Login ke VPS

### Dari Windows (PowerShell atau Command Prompt):

```powershell
ssh root@IP_VPS_ANDA
```

Contoh:
```powershell
ssh root@103.123.45.67
```

Ketik **yes** jika diminta, lalu masukkan password.

### Jika Berhasil, Anda akan melihat:

```
Welcome to Ubuntu 22.04.3 LTS
root@vps-xxxxx:~#
```

> 💡 **Tips**: Bisa juga pakai aplikasi **PuTTY** jika lebih familiar.

---

## 4. Install Docker

Jalankan command berikut satu per satu:

```bash
# Update sistem
apt update && apt upgrade -y

# Install Docker (otomatis)
curl -fsSL https://get.docker.com | sh

# Verifikasi instalasi
docker --version
docker compose version
```

### Hasil yang Diharapkan:

```
Docker version 24.x.x
Docker Compose version v2.x.x
```

---

## 5. Install Supabase

```bash
# Clone repository Supabase
git clone --depth 1 https://github.com/supabase/supabase

# Masuk ke folder docker
cd supabase/docker

# Copy template konfigurasi
cp .env.example .env
```

---

## 6. Konfigurasi Supabase

### Generate Secret Keys

Pertama, generate beberapa random string untuk keamanan:

```bash
# Generate JWT Secret (copy hasilnya)
echo "JWT_SECRET: $(openssl rand -base64 32)"

# Generate ANON Key (copy hasilnya)  
echo "ANON_KEY: $(openssl rand -base64 32)"

# Generate SERVICE_ROLE Key (copy hasilnya)
echo "SERVICE_ROLE_KEY: $(openssl rand -base64 32)"

# Generate Postgres Password (copy hasilnya)
echo "POSTGRES_PASSWORD: $(openssl rand -base64 24)"

# Generate Dashboard Password (copy hasilnya)
echo "DASHBOARD_PASSWORD: $(openssl rand -base64 16)"
```

**CATAT SEMUA HASIL INI!** Anda akan membutuhkannya.

### Edit File .env

```bash
nano .env
```

Cari dan ubah nilai-nilai berikut:

```env
############
# Secrets - GANTI SEMUA INI dengan yang sudah di-generate
############

POSTGRES_PASSWORD=hasil_generate_postgres_password

JWT_SECRET=hasil_generate_jwt_secret

ANON_KEY=hasil_generate_anon_key

SERVICE_ROLE_KEY=hasil_generate_service_role_key

############
# URLs - Ganti dengan IP VPS Anda
############

SITE_URL=http://IP_VPS_ANDA:3000
API_EXTERNAL_URL=http://IP_VPS_ANDA:8000

# Contoh:
# SITE_URL=http://103.123.45.67:3000
# API_EXTERNAL_URL=http://103.123.45.67:8000

############
# Dashboard Credentials
############

DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=hasil_generate_dashboard_password
```

### Simpan File:
- Tekan `Ctrl + O` → Enter (untuk save)
- Tekan `Ctrl + X` (untuk keluar)

---

## 7. Jalankan Supabase

```bash
# Download semua Docker images (mungkin butuh 5-10 menit)
docker compose pull

# Jalankan Supabase
docker compose up -d

# Cek status semua services
docker compose ps
```

### Hasil yang Diharapkan:

Semua services harus berstatus **running**:

```
NAME                       STATUS
supabase-analytics         running
supabase-auth              running
supabase-db                running
supabase-kong              running
supabase-meta              running
supabase-realtime          running
supabase-rest              running
supabase-storage           running
supabase-studio            running
```

### Akses Dashboard:

Buka browser dan akses:

| Service | URL |
|---------|-----|
| **Supabase Studio** | `http://IP_VPS_ANDA:3000` |
| **API Endpoint** | `http://IP_VPS_ANDA:8000` |

Login dengan:
- Username: `admin` (atau sesuai DASHBOARD_USERNAME)
- Password: `hasil_generate_dashboard_password`

---

## 8. Migrasi Database

Sekarang kita perlu memindahkan struktur database dari Supabase Cloud ke VPS.

### Opsi A: Via Supabase Studio (Manual)

1. Buka Supabase Studio (`http://IP_VPS_ANDA:3000`)
2. Klik **SQL Editor**
3. Buka file migration di komputer Anda:
   `warehouse-main/supabase/migrations/`
4. Copy-paste isi setiap file SQL **satu per satu** berurutan
5. Klik **Run** untuk setiap file

**Urutan file migration (dari yang paling awal):**

```
20260111115055_11c9ea6d-cabd-43fb-bd8b-8fbd1bbd56ef.sql
20260111115115_8be15817-dcff-4aae-a5c7-dfc50e95f892.sql
20260111115747_b834362e-08bf-4c5f-9cb6-aa7b63b9eb5c.sql
... (lanjutkan sampai file terakhir)
20260203_quick_sale_nullable_product.sql
```

### Opsi B: Via Command Line (Lebih Cepat)

Dari komputer Windows Anda, upload semua migration files:

```powershell
# Dari folder warehouse-main
scp -r supabase/migrations root@IP_VPS_ANDA:/root/
```

Lalu di VPS:

```bash
# Masuk ke container database
docker exec -it supabase-db psql -U postgres

# Jalankan setiap migration (contoh)
\i /root/migrations/20260111115055_11c9ea6d-cabd-43fb-bd8b-8fbd1bbd56ef.sql
```

### Jangan Lupa: Setup Storage Buckets

Di Supabase Studio → **Storage** → **New Bucket**, buat:

1. `documents` - untuk bukti pengiriman, dll
2. `avatars` - untuk foto profil user
3. `uploads` - untuk attachment lainnya

Untuk setiap bucket, set ke **Public** jika perlu diakses publik.

---

## 9. Update Aplikasi Warehouse

### Dapatkan ANON KEY dari VPS

Di Supabase Studio:
1. Klik **Settings** (gear icon)
2. Klik **API**
3. Copy nilai **anon public** key

### Update File .env di Proyek

Buka file `warehouse-main/.env` dan ubah:

```env
# Sebelumnya (Supabase Cloud)
VITE_SUPABASE_URL="https://hssgofbwjzntytmfnqoz.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_Jnz93Pfh..."

# Setelahnya (Self-Hosted)
VITE_SUPABASE_URL="http://IP_VPS_ANDA:8000"
VITE_SUPABASE_PUBLISHABLE_KEY="anon_key_dari_vps"
```

### Test Aplikasi

```bash
npm run dev
```

Buka browser dan coba login. Jika berhasil, aplikasi sudah terkoneksi ke Supabase di VPS Anda! 🎉

---

## 10. Setup Domain & SSL (Opsional)

Agar lebih profesional dan aman, gunakan domain dengan HTTPS.

### Install Nginx

```bash
apt install nginx -y
```

### Konfigurasi Nginx

```bash
nano /etc/nginx/sites-available/supabase
```

Paste konfigurasi ini:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # API (Kong)
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name studio.your-domain.com;

    # Studio Dashboard
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Aktifkan konfigurasi:

```bash
ln -s /etc/nginx/sites-available/supabase /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### Install SSL dengan Certbot

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d your-domain.com -d studio.your-domain.com
```

Ikuti instruksi untuk mendapatkan sertifikat SSL gratis.

### Update .env dengan Domain

```env
VITE_SUPABASE_URL="https://your-domain.com"
```

---

## 11. Backup & Maintenance

### Backup Database Otomatis

Buat script backup:

```bash
nano /root/backup-supabase.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/backups"
mkdir -p $BACKUP_DIR

# Backup database
docker exec supabase-db pg_dump -U postgres > $BACKUP_DIR/db_$DATE.sql

# Compress
gzip $BACKUP_DIR/db_$DATE.sql

# Hapus backup lebih dari 7 hari
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: db_$DATE.sql.gz"
```

Jadikan executable dan setup cron:

```bash
chmod +x /root/backup-supabase.sh

# Edit crontab
crontab -e

# Tambahkan baris ini untuk backup setiap hari jam 2 pagi
0 2 * * * /root/backup-supabase.sh
```

### Update Supabase

```bash
cd /root/supabase/docker
docker compose pull
docker compose up -d
```

### Monitor Resource

```bash
# Cek penggunaan RAM & CPU
htop

# Cek disk space
df -h

# Cek logs
docker compose logs -f
```

---

## 12. Troubleshooting

### Supabase tidak bisa diakses

```bash
# Cek apakah semua container berjalan
docker compose ps

# Restart semua services
docker compose restart

# Lihat logs error
docker compose logs supabase-kong
docker compose logs supabase-auth
```

### Database connection error

```bash
# Cek status PostgreSQL
docker compose logs supabase-db

# Restart database
docker compose restart supabase-db
```

### Port tidak bisa diakses

```bash
# Cek firewall
ufw status

# Buka port jika diperlukan
ufw allow 3000
ufw allow 8000
```

### Storage upload gagal

```bash
# Cek logs storage
docker compose logs supabase-storage

# Cek permission bucket di Studio
```

### Out of memory

```bash
# Cek memory usage
free -h

# Jika kurang, upgrade VPS atau optimasi
```

---

## 📝 Catatan Penting yang Harus Disimpan

Simpan informasi ini di tempat aman:

```
VPS IP: ___________________________
SSH Password: ____________________

Supabase:
- Dashboard URL: http://IP:3000
- API URL: http://IP:8000
- Dashboard Username: admin
- Dashboard Password: _______________
- ANON_KEY: _________________________
- SERVICE_ROLE_KEY: _________________
- JWT_SECRET: _______________________
- POSTGRES_PASSWORD: ________________
```

---

## ✅ Checklist Instalasi

```
□ VPS sudah disewa dan dapat IP
□ Bisa login SSH ke VPS
□ Docker terinstall
□ Supabase di-clone
□ File .env dikonfigurasi
□ Supabase berjalan (docker compose up)
□ Bisa akses Studio Dashboard
□ Migration database dijalankan
□ Storage buckets dibuat
□ File .env aplikasi di-update
□ Aplikasi bisa connect ke Supabase baru
□ (Opsional) Domain & SSL dikonfigurasi
□ (Opsional) Backup otomatis di-setup
```

---

## 🎉 Selesai!

Selamat! Supabase Anda sekarang berjalan di VPS sendiri dengan:
- ✅ Database unlimited
- ✅ Storage unlimited
- ✅ Tidak ada biaya cloud bulanan
- ✅ Data 100% milik Anda

Jika ada masalah, jangan ragu untuk bertanya! 🚀
