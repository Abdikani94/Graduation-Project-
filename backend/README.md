# Jamhuriya Admission Backend

Backend API for the automated online admission gateway. It follows the PDF requirements: online applications, document upload support, payment tracking, admin dashboard, reports, contact/support messages, role-based access, settings, and activity logs.

## MySQL / MariaDB (XAMPP)

The backend stores application data in the local XAMPP MySQL/MariaDB database:

```text
host: 127.0.0.1
port: 3306
database: jamhuriya_admission
```

Start MySQL from the XAMPP Control Panel before seeding or starting the backend.
The server creates a local recovery snapshot in `backend/data/mysql-backups`
at startup and keeps the latest 10 snapshots. You can also run `npm run backup:mysql`.

## Run

```bash
cd backend
npm run seed
npm run dev
```

`npm run seed` safely initializes a missing database and preserves all existing
classes, applications, students, payments, and other records.

When startup succeeds, the terminal prints:

```text
Server is running on port 5055
```

If you see `Port 5055 is already in use`, another backend server is already running on that port. Use the existing server, stop it, or change `PORT` in `backend/.env`.

API base URL:

```text
http://127.0.0.1:5055
```

Default admin login:

```text
username: admin
password: admin12345
```

Default officer login:

```text
username: officer
password: officer12345
```

## Main Routes

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/applications`
- `GET /api/applications`
- `PATCH /api/applications/:id/status`
- `GET /api/students`
- `GET /api/payments`
- `PATCH /api/payments/:id/status`
- `GET /api/programs`
- `POST /api/programs`
- `POST /api/contact-messages`
- `GET /api/dashboard`
- `GET /api/reports/summary`
- `GET /api/admin-users`
- `GET /api/settings`
- `GET /api/activity-log`

Protected routes need:

```text
Authorization: Bearer <token>
```

With the included `.env`, application data is stored in MySQL/MariaDB under the
`jamhuriya_admission` database. Uploaded application files are stored under
`backend/uploads/applications`; database records only store their metadata and paths.
