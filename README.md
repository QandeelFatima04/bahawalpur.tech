# CareerBridge AI MVP

Monorepo implementation:
- `apps/api`: FastAPI backend (auth, profiles, resumes, AI parsing, matching, jobs, applications, interviews, companies, admin).
- `apps/web`: Next.js + Tailwind + shadcn/ui frontend dashboards (student / company / admin).
- `infra/aws`: Terraform skeleton for S3 and RDS.

## Quick Start — Docker Compose (recommended)

```powershell
docker compose up --build -d
docker compose ps
```

Services:
- Web: http://localhost:3000
- API: http://localhost:8000/health
- Postgres: localhost:5432 (`careerbridge/careerbridge`)

The API container runs `alembic upgrade head` automatically before launching uvicorn.

## Local development (without Docker)

### 1) Postgres
Start Postgres via compose while running the API and web locally:
```powershell
docker compose up -d db
```
Alternatively point `DATABASE_URL` at `sqlite:///./careerbridge.db` for a purely local run.

### 2) Backend
```powershell
cd apps/api
copy .env.example .env
py -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

### 3) Frontend
```powershell
cd apps/web
npm install
npm run dev
```
Frontend default API base: `http://localhost:8000` (override with `NEXT_PUBLIC_API_BASE`).

## Database migrations

- `alembic upgrade head` — apply all pending migrations.
- `alembic downgrade -1` — roll back one migration.
- `alembic revision -m "message" --autogenerate` — generate a new migration after changing SQLAlchemy models.

The initial migration (`alembic/versions/0001_initial_schema.py`) creates the full schema via `Base.metadata.create_all`. Add explicit `op.add_column` / `op.create_table` migrations for future changes.

## Implemented APIs

### Auth
- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/password-reset`

### Student
- `GET/PUT /students/me/profile`
- `PATCH /students/me/visibility`
- `POST /students/me/resume`, `GET /students/me/resume/{id}/status`
- `GET /students/me/report`
- `GET /students/me/jobs` — browse active jobs with your match score and the job's `apply_threshold`.
- `POST /students/me/applications` — apply to a job. Rejected with 403 if your match score is below `job.apply_threshold`.
- `GET /students/me/applications` — list your applications.
- `GET /students/me/interviews` — list incoming interview requests.
- `POST /students/me/interviews/{id}/accept` / `reject` — respond to an interview request.

### Company
- `POST /companies/jobs`, `PATCH /companies/jobs/{id}`, `GET /companies/jobs`
- `GET /companies/jobs/{id}/candidates` — ranked candidate list for a job.
- `GET /companies/jobs/{id}/applicants` — candidates who actually applied.
- `POST /companies/shortlists`, `POST /companies/contact`
- `POST /companies/interviews` — send interview request.
- `GET /companies/interviews` — list interviews.
- `POST /companies/interviews/{id}/hire` — mark hire Yes/No on or after interview date.

### Matches
- `GET /matches/jobs/{job_id}`

### Admin
- `GET/POST /admin/companies/pending` · `POST /admin/companies/{id}/{approve|reject}`
- `GET /admin/students`, `PATCH /admin/students/{id}` (disable, edit)
- `GET /admin/companies`, `PATCH /admin/companies/{id}` (disable, edit)
- `GET /admin/jobs`, `PATCH /admin/jobs/{id}` (disable, edit)
- `GET /admin/interviews`, `PATCH /admin/interviews/{id}` (cancel, reschedule)
- `GET /admin/analytics` — counts for students / verified companies / active jobs / active interviews.
- `GET /admin/ai-audit`

## Notes

- Resume upload supports `.pdf`, `.doc`, `.docx`. PDF text is extracted with `pypdf`, DOCX via `python-docx`.
- AI parsing/report uses OpenAI (`gpt-4.1-mini`) when `OPENAI_API_KEY` is set; otherwise a deterministic fallback runs.
- Async resume processing uses `FastAPI BackgroundTasks` with a status-polling envelope.
- Each job stores its own `apply_threshold` (0-100, default 60). Companies can loosen or tighten who is allowed to apply.

## Email (milestone notifications)

Students and companies get emails on key events: **company approved**, **interview requested**, **interview accepted/rejected**, **hire decision**. An accepted interview also carries the Jitsi meeting link.

By default (no SMTP configured), emails are **logged to stdout** instead of being sent. To see them locally:

```
docker compose logs api | grep "\[email/dev\]"
```

To send real email, set these in `apps/api/.env.docker` and rebuild the api container:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-account@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=CareerBridge AI <no-reply@yourdomain.com>
SMTP_USE_TLS=true
```
