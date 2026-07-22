# Jamhuriya Online Registration System

Full-stack university admission and registration system with a React/Vite frontend and a Node.js backend.

## Project structure

```text
Graduation-Project/
├── backend/    Node.js API, MongoDB integration, uploads, and WaafiPay integration
└── frontend/   React application built with Vite and Tailwind CSS
```

## Requirements

- Node.js 18 or newer
- npm
- MongoDB running locally, or access to a MongoDB server

## Initial setup

Install dependencies in both applications:

```powershell
cd backend
npm.cmd install

cd ..\frontend
npm.cmd install
```

Create the private backend configuration from the example:

```powershell
Copy-Item backend\.env.example backend\.env
```

Update `backend/.env` with the correct database, security, CORS, and WaafiPay values. Never commit this file or place WaafiPay credentials in frontend code.

## Run locally

Open two terminals from the project directory.

Backend:

```powershell
cd backend
npm.cmd run dev
```

Frontend:

```powershell
cd frontend
npm.cmd run dev
```

The frontend uses `http://127.0.0.1:5000` as its default API address. To use another address, configure `VITE_API_URL` in a private frontend environment file.

## Verification

```powershell
cd backend
npm.cmd test

cd ..\frontend
npm.cmd run lint
npm.cmd run build
```

The generated `frontend/dist` directory, dependencies, credentials, logs, local runtime data, and uploaded files are intentionally excluded from Git.

For backend routes and additional configuration details, see [backend/README.md](backend/README.md).
