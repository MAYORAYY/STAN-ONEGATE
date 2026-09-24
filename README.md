# STAN OneGate

STAN OneGate adalah platform terintegrasi untuk layanan akademik, presensi, LMS, aset, karakter, dan helpdesk. Proyek ini menggunakan monorepo npm workspaces dan Turbo.

## Arsitektur

```text
Frontend (Vite + React)
        |
        v
API Gateway (:3000)
   |             |
   v             v
Identity      Adapters
(:3001)       (:3002 - :3004)
   |
   v
PostgreSQL + Prisma
```

## Struktur Proyek

- `apps/frontend`: antarmuka React dengan Vite.
- `apps/gateway`: API Gateway dan reverse proxy.
- `apps/identity-service`: autentikasi, JWT, refresh token, dan penyimpanan sesi.
- `apps/adapters/academic`: adapter layanan akademik.
- `apps/adapters/attendance`: adapter presensi.
- `apps/adapters/lms`: adapter LMS.
- `packages/shared`: package bersama.
- `prisma`: schema dan migration database Identity Service.

## Persyaratan

- Node.js
- npm 11 atau versi kompatibel
- PostgreSQL
- Akses jaringan ke portal akademik dan LMS jika fitur sinkronisasi digunakan

## Instalasi

Dari root proyek:

```powershell
npm install
```

## Environment

Setiap service membaca environment-nya sendiri. Jangan commit file `.env` atau `.env.development` yang berisi secret.

### Identity Service

Buat file `apps/identity-service/.env.development`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DATABASE_NAME"
JWT_SECRET=ganti-dengan-secret-jwt
ENCRYPTION_KEY=64-karakter-hex-untuk-aes-256
PORT=3001
```

`ENCRYPTION_KEY` harus tepat 64 karakter hexadecimal atau 32 byte. Identity Service memuat file ini melalui `dotenv`.

### Attendance Adapter

Buat file `apps/adapters/attendance/.env.development`:

```env
JWT_SECRET=ganti-dengan-secret-jwt-yang-sama
PORT=3002
```

`JWT_SECRET` harus sama dengan Identity Service agar adapter dapat memverifikasi access token.

### Secret lokal

Contoh membuat secret hexadecimal dengan PowerShell:

```powershell
$secret = [Convert]::ToHexString((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
$secret
```

## Database

Setelah `DATABASE_URL` tersedia, jalankan migration dan generate Prisma Client dari folder Identity Service:

```powershell
cd apps/identity-service
npx prisma migrate dev
npx prisma generate
cd ../..
```

## Menjalankan Development

Dari root proyek:

```powershell
npm run dev
```

Perintah tersebut menjalankan semua workspace yang memiliki script `dev` melalui Turbo.

Port lokal:

| Komponen | Port | URL |
| --- | ---: | --- |
| Frontend | 5173 | `http://localhost:5173` |
| Gateway | 3000 | `http://localhost:3000` |
| Identity Service | 3001 | `http://localhost:3001` |
| Attendance Adapter | 3002 | `http://localhost:3002` |
| Academic Adapter | 3003 | `http://localhost:3003` |
| LMS Adapter | 3004 | `http://localhost:3004` |

Frontend dapat diakses langsung melalui `http://localhost:5173`. Untuk request melalui gateway, gunakan `http://localhost:3000`.

## Integrasi LMS

LMS Adapter mengambil data dari Moodle menggunakan sesi LMS milik pengguna yang disimpan oleh Identity Service. Data yang ditampilkan di halaman LMS OneGate meliputi:

- daftar mata kuliah dan progres;
- section kursus seperti `General` dan `Pertemuan 1`;
- resource, forum, file, assignment, dan aktivitas lain di setiap section.

Endpoint adapter:

```text
GET http://localhost:3004/adapter/lms/courses
GET http://localhost:3004/adapter/lms/courses/:courseId
GET http://localhost:3004/adapter/lms/assignments
```

Detail kursus mengambil isi dari endpoint Moodle `core_course_get_contents`. Jika Moodle hanya mengembalikan nama section tanpa aktivitas, adapter mengambil halaman section Moodle secara langsung menggunakan URL seperti `course/view.php?id=<courseId>&section=<sectionNumber>`. Aktivitas kemudian ditampilkan di OneGate dan dideduplikasi berdasarkan link serta judul.

Judul section dan isi kursus ditampilkan di dalam UI OneGate. Link Moodle digunakan sebagai referensi resource, bukan sebagai navigasi untuk judul section.

Untuk menjalankan adapter LMS secara terpisah:

```powershell
cd apps/adapters/lms
npm run dev
```

Validasi TypeScript adapter LMS:

```powershell
npx tsc --noEmit --target ES2020 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --ignoreDeprecations 6.0 src/index.ts
```

## Autentikasi

### Login

```http
POST /identity/login
Content-Type: application/json

{
  "nim": "NIM pengguna",
  "password": "kata sandi pengguna"
}
```

Login menghasilkan `accessToken` dan `refreshToken`. Frontend menyimpannya di local storage.

### Refresh access token

```http
POST /identity/refresh
Content-Type: application/json

{
  "refreshToken": "refresh-token"
}
```

### Logout

```http
POST /identity/logout
Content-Type: application/json

{
  "refreshToken": "refresh-token"
}
```

Logout mencabut refresh token di database. Aplikasi klien juga harus menghapus token dari local storage.

### Endpoint sesi

```http
GET /identity/sessions
Authorization: Bearer <access-token>
```

Endpoint ini terproteksi dan digunakan adapter untuk mengambil sesi portal yang tersimpan secara terenkripsi.

## Build

```powershell
npm run build
```

## Troubleshooting

### `JWT_SECRET wajib diset`

Pastikan file environment berada di folder service yang sesuai dan berisi `JWT_SECRET`. Pastikan service memuat file `.env.development` sebelum membaca `process.env`.

### Port 3001 tidak aktif

Periksa output terminal Identity Service. Penyebab umum:

- `JWT_SECRET` belum diisi.
- `ENCRYPTION_KEY` bukan 64 karakter hexadecimal.
- `DATABASE_URL` belum benar.
- PostgreSQL belum berjalan.
- Prisma Client belum di-generate.

### Token ditolak adapter

Pastikan nilai `JWT_SECRET` pada Identity Service dan semua adapter sama persis.

### Section LMS kosong atau resource tidak muncul

1. Pastikan Identity Service, LMS Adapter, dan frontend sedang berjalan.
2. Pastikan sesi LMS masih aktif dengan login ulang jika diperlukan.
3. Restart LMS Adapter setelah mengubah parser atau selector Moodle.
4. Refresh halaman OneGate dengan `Ctrl + Shift + R`.
5. Periksa log LMS Adapter untuk error saat mengambil halaman section Moodle.

## Keamanan

- Jangan commit secret, password database, access token, atau refresh token.
- Gunakan secret berbeda untuk environment production.
- Refresh token disimpan dalam bentuk hash di database.
- Sesi portal dan LMS disimpan terenkripsi menggunakan AES-256-CBC.
