# aegis-desktop

FastAPI + static frontend implementation of the AEGIS employee onboarding desktop UI.
The MVP reads from the AegisAI PostgreSQL database when `backend/.env` contains a `DB_CON_STR` that starts with `postgresql`.

## MVC Layout

- `backend/app/models`: Pydantic domain models.
- `backend/app/controllers`: FastAPI route controllers.
- `backend/app/services`: business logic and view-model assembly.
- `backend/app/database`: SQLite connection, schema, and demo seed data.
- `backend/app/database/postgres.py`: Aiven PostgreSQL connection helper.
- `frontend/views`: HTML views served by FastAPI.
- `frontend/static/css`: extracted UI styles.
- `frontend/static/js`: extracted UI logic and backend API bridge.

## Run

### Backend

```powershell
cd "C:\Users\USER\Downloads\101 apples\mvp\aegis-desktop\backend"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```

### Backend with Docker

```powershell
cd "C:\Users\USER\Downloads\101 apples\mvp\aegis-desktop\backend"
docker build -t aegis-backend-test .
docker run --env-file .env -p 5000:5000 aegis-backend-test
```

Without `--env-file .env`, the `/api/v1` dashboard, case, audit, and HIL read endpoints fall back to the local SQLite demo data.

### React Frontend

```powershell
cd "C:\Users\USER\Downloads\101 apples\mvp\aegis-desktop\frontend"
npm.cmd install
npm.cmd run dev
```

Open:

- React dev app: http://127.0.0.1:5173/
- React dev app: http://127.0.0.1:5000/
- Built app served by backend: http://127.0.0.1:5000/
- API docs: http://127.0.0.1:5000/docs
- Bootstrap data: http://127.0.0.1:5000/api/bootstrap
- MVP dashboard data: http://127.0.0.1:5000/api/mvp/dashboard

### Seed MVP Dummy Data

```powershell
cd "C:\Users\USER\Downloads\101 apples\mvp\aegis-desktop\backend"
.\.venv\Scripts\python.exe scripts\seed_mvp_data.py
```

## Data Source

The current `.env` was merged from the provided AegisAI backend and points to PostgreSQL. The desktop UI hydrates from:

- `candidates`
- `onboarding_cases`
- `audit_logs`

If `DB_CON_STR` is changed back to `sqlite:///./aegis.db`, the app falls back to the local seeded SQLite demo.
