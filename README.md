# HRYAAR Digi-PoSH — Multi-Tenant Training Management Platform

Production-ready, multi-tenant B2B SaaS platform for monitoring corporate Prevention of Sexual Harassment (PoSH) compliance under the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013.

## Tech Stack
- **Frontend**: Next.js (App Router), React 19, TypeScript, Tailwind CSS, Recharts, TanStack Query, Axios, Lucide Icons
- **Backend**: FastAPI (Python 3.10+), SQLAlchemy 2.x, Pydantic v2, Alembic, SQLite (dev) / PostgreSQL (Supabase/production), Pytest, ReportLab
- **Security & Multi-Tenancy**: Strict tenant scoping (`company_id` isolation), JWT authentication with SHA-256 / bcrypt salt verification, automated cross-tenant security unit tests.

## Running Locally

### Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python -m app.db.seed
uvicorn app.main:app --port 8001
```

### Frontend
```bash
cd frontend
npm install
npm run dev -p 3001
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Test Credentials
1. **Acme Corp HR Admin** (1,250 Employees): `hr@acme.com` / `Acme@1234`
2. **Beta Industries HR Admin** (600 Employees): `hr@beta.com` / `Beta@1234`
3. **Platform Super Admin**: `superadmin@hryaar.com` / `Admin@1234`

### Running Automated Multi-Tenant Tests
```bash
cd backend
.\venv\Scripts\pytest app/tests
```
