# Jamhuriya Admission Backend

Backend API for the automated online admission gateway. It follows the PDF requirements: online applications, document upload support, payment tracking, admin dashboard, reports, contact/support messages, role-based access, settings, and activity logs.

## MongoDB

The backend is configured to use local MongoDB:

```text
mongodb://localhost:27017
database: jamhuriya_admission
```

Make sure MongoDB is running before seeding or starting the backend.

## Run

```bash
cd backend
npm run seed
npm run dev
```

When startup succeeds, the terminal prints:

```text
MongoDB connected: mongodb://localhost:27017/jamhuriya_admission
Server is running on port 4000
API URL: http://127.0.0.1:4000
```

If you see `Port 4000 is already in use`, another backend server is already running on that port. Use the existing server, stop it, or change `PORT` in `backend/.env`.

API base URL:

```text
http://127.0.0.1:4000
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

With the included `.env`, application data is stored in MongoDB under the `jamhuriya_admission` database. Uploaded application files are stored under `backend/uploads/applications`.
