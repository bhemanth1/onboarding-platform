# AEGIS Desktop

FastAPI backend and Vite/React frontend for the AEGIS employee onboarding desktop.

## Project Structure

```text
aegis-desktop/
  backend/    FastAPI app, controllers, services, database code
  frontend/   React app, Vite config, Nginx config
```

## URL Prefixes

- Frontend is served under: `/dana-aegis-fe`
- Backend APIs are served under: `/dana-aegis`
- Example API path: `http://localhost:5001/dana-aegis/api/v1/cases`
- Health check: `http://localhost:5001/dana-aegis/health`
- API docs: `http://localhost:5001/docs`

## Requirements

- Python 3.12+
- Node.js 22+
- Docker or Podman, optional
- Backend `.env` file with `DB_CON_STR`

Create `backend/.env`:

```env
DB_CON_STR=postgresql+asyncpg://USER:PASSWORD@HOST:PORT/DB_NAME?ssl=require
```

## Run Without Docker

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload
```

Backend runs at:

```text
http://localhost:5001
```

### 2. Frontend

Open a new terminal:

```powershell
cd frontend
npm install
$env:VITE_API_URL="http://localhost:5001"
npm run dev
```

Frontend runs at:

```text
http://localhost:5000/dana-aegis-fe/
```

## Run With Docker

### 1. Backend

```powershell
cd backend
docker build -t aegis-backend .
docker rm -f dana-be
docker run --name dana-be --env-file .env -p 5001:5000 aegis-backend
```

Backend runs at:

```text
http://localhost:5001
```

### 2. Frontend

Open a new terminal:

```powershell
cd frontend
docker build -t aegis-frontend --build-arg VITE_API_URL=http://localhost:5001 .
docker rm -f dana-fe
docker run --name dana-fe -p 5000:5000 aegis-frontend
```

Frontend runs at:

```text
http://localhost:5000/dana-aegis-fe/
```

## Build Frontend Locally

```powershell
cd frontend
$env:VITE_API_URL="http://localhost:5001"
npm run build
```

The production files are generated in:

```text
frontend/dist/
```

## Important Notes

- `VITE_API_URL` is injected at frontend build time.
- If the backend URL changes, rebuild the frontend.
- `VITE_API_URL` can be set with or without `/dana-aegis`; the frontend normalizes it automatically.
- Use `/dana-aegis-fe/` for frontend browser routes.
- Use `/dana-aegis/...` for all backend API calls.

## Common Checks

```text
Frontend:    http://localhost:5000/dana-aegis-fe/
Backend:     http://localhost:5001
Health:      http://localhost:5001/dana-aegis/health
API Docs:    http://localhost:5001/docs
Sample API:  http://localhost:5001/dana-aegis/api/v1/cases
```

## PostgreSQL Schema And Seed Data

If the backend logs errors like `relation "onboarding_cases" does not exist`,
create and seed the PostgreSQL schema from the backend folder:

```powershell
.\.venv\Scripts\python.exe scripts\seed_postgres_all.py
```

To create only the schema and tables without demo rows:

```powershell
.\.venv\Scripts\python.exe scripts\seed_postgres_all.py --schema-only
```
