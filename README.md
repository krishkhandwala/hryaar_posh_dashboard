# HRYAAR Digi-PoSH — Multi-Tenant Enterprise SaaS Platform

Production-ready, multi-tenant B2B SaaS platform for monitoring corporate Prevention of Sexual Harassment (PoSH) compliance under the Sexual Harassment of Women at Workplace (Prevention, Prohibition and Redressal) Act, 2013.

> 📖 **Comprehensive System Manual**: For in-depth architecture diagrams, database dictionaries, operational playbooks, and developer handover documentation, see [COMPLETE_SYSTEM_AND_OPERATIONS_MANUAL.md](COMPLETE_SYSTEM_AND_OPERATIONS_MANUAL.md).

## Overview & Architecture

HRYAAR Digi-PoSH allows multiple independent organizations to use the same deployed application simultaneously while guaranteeing:
- **Dynamic White-Label Branding**: Dedicated company logos, corporate color themes (primary, secondary, accent, sidebar), custom welcome messages, and favicon support via real-time CSS variable injection.
- **Strict Server-Derived Tenant Scoping**: Authenticated identity-driven multi-tenancy. Client query or body params cannot override tenant authorization. Cross-tenant queries are blocked with `403 Forbidden`.
- **Three-Level Role-Based Access Control (RBAC)**:
  1. **Platform Super Admin**: Central SaaS control hub to provision, suspend, activate, and manage all tenant organizations, platform users, subscription plans, platform-wide analytics, and audit logs.
  2. **Company Admin**: Tenant-scoped management of company branding, employee rosters, HR managers, Internal Committee (IC) constitution, compliance parameters, and POSH complaints.
  3. **Internal Committee (IC) Members & Employees**: Confidential access to assigned statutory cases, sensitization training records, and verified certificates.
- **Statutory POSH Complaints Redressal**: Mandatory 90-day inquiry tracking, confidential complainant identity protection, conciliation records (Section 10), and formal IC inquiry reports (Section 11).
- **Internal Committee Gazette Constitution**: Section 4 statutory validator ensuring gazetted Presiding Officer (senior woman), external expert (NGO/Advocate), and quorum fulfillment.
- **Commercialization & Subscriptions**: Multi-tier architecture (Free Trial, Basic, Professional, Enterprise) with employee limits and feature restrictions.

---

## Tech Stack

- **Frontend**: Next.js 16.4.3 (App Router & Turbopack), React 19, TypeScript 5, Tailwind CSS, Recharts, Lucide Icons, Framer Motion, Axios.
- **Backend**: FastAPI 0.111.0 (Python 3.10+), SQLAlchemy 2.0.30, Pydantic v2 (ConfigDict), SQLite (dev) / PostgreSQL (production), Pytest, ReportLab.
- **Security & Multi-Tenancy**: Cryptographic JWT authentication, server-derived tenant resolution, tenant-isolated file uploads (`/static/uploads/`), zero-leak audit trails.

---

## Running Locally

### 1. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate   # Windows (or source venv/bin/activate on Linux/macOS)
pip install -r requirements.txt
python -m app.db.seed
uvicorn app.main:app --port 8001
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev -p 3001
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## Default Multi-Tenant Test Personas

| Persona | Level / Role | Email | Password | Details & Branding |
| :--- | :--- | :--- | :--- | :--- |
| **HRYAAR Tech Master** | Level 0 Master (Tech Lead) | `tech@hryaar.com` / `superadmin@hryaar.com` | `Admin@1234` | HRYAAR Lead Tech Architect; owns multi-tenant core, microservices, quota allocations |
| **Middleman Partner A (TalentPro)** | Level 1 Assigner | `partner@talentpro.com` | `Partner@1234` | 5,000 Quota; Resells to Acme Cloud and Nexus BioSciences |
| **Middleman Partner B (Apex)** | Level 1 Assigner | `partner@apex.com` | `Partner@1234` | 3,000 Quota; Resells to Beta Industries Precision Mfg |
| **Acme Corp HR Admin** | Level 2 Client HR Lead | `hr@acme.com` | `Acme@1234` | 1,250 Employees, Tech Sector (Navy & Blue Palette `#142D50`) |
| **Nexus Bio HR Admin** | Level 2 Client HR Lead | `hr@nexusbio.com` | `Nexus@1234` | 450 Employees, Biotech Sector (Royal Violet Palette `#5B21B6`) |
| **Beta Industries HR Admin** | Level 2 Client HR Lead | `hr@beta.com` | `Beta@1234` | 600 Employees, Manufacturing (Emerald Palette `#065F46`) |
| **Rohan Reddy (ACM-1194)** | Level 3 Mandated Learner | `rohan.reddy194@acmecorp.com` | `Employee@1234` | Training in progress (Curriculum modules & quiz) |
| **Ananya Mehta (ACM-1001)** | Level 3 Certified Learner | `ananya.mehta1@acmecorp.com` | `Employee@1234` | 100% Certified with downloadable official certificate |

---

## Running Automated Multi-Tenant Test Suite

The test suite validates cross-tenant isolation, branding isolation, role enforcement, suspension lifecycles, and the full end-to-end Definition of Done scenario:

```bash
cd backend
.\venv\Scripts\python -m pytest app/tests -v
```

---

## API Architecture Reference

### Super Admin Endpoints (`/api/v1/super-admin/...`)
- `GET /companies` — List all registered organizations with user counts and plans.
- `POST /companies` — Provision a new tenant company with default admin account.
- `GET /companies/{id}` — Retrieve detailed company profile.
- `PUT /companies/{id}` — Update company details, colors, and industry.
- `PATCH /companies/{id}/status` — Activate, suspend, or deactivate a tenant.
- `DELETE /companies/{id}` — Audited removal of an organization.
- `POST /companies/{id}/logo` — Upload brand logo asset for any organization.
- `GET /users` — View all users across the platform with filtering.
- `POST /users` — Provision platform or company administrators.
- `POST /users/{id}/reset-password` — Secure password reset.
- `GET /subscriptions` — List subscription plans and allocations.
- `GET /analytics` — Platform-wide analytics (companies, users, complaints, compliance).
- `GET /system-health` — Real-time health metrics, database connection status.
- `GET /audit-logs` — Immutable platform audit trail.

### Company Admin & Tenant Endpoints (`/api/v1/company/...`)
- `GET /profile`, `PUT /profile` — Company profile management.
- `GET /branding`, `PUT /branding` — Dynamic theme colors, sidebar palette, welcome message.
- `POST /branding/logo` — Upload company logo (PNG, JPG, SVG, WebP up to 5MB).
- `GET /users`, `POST /users`, `DELETE /users/{id}` — Manage company users and HR staff.
- `GET /complaints`, `POST /complaints`, `GET /complaints/{id}`, `PUT /complaints/{id}` — PoSH statutory complaints management and inquiry progression.
- `GET /ic-members`, `POST /ic-members`, `DELETE /ic-members/{id}` — Internal Committee constitution register.
- `GET /subscription` — Quota tracking against subscription limits.

### Dashboard Core Endpoints (`/api/v1/...`)
- `GET /dashboard/kpis` — Tenant-scoped executive KPIs.
- `GET /dashboard/departments` — Departmental compliance distributions.
- `GET /dashboard/assessment-bands` — Score distribution donut statistics.
- `GET /dashboard/program-stages` — 5-stage implementation milestones.
- `GET /dashboard/webinars` — IC workshops and legal training sessions.
- `GET /employees`, `POST /employees` — Searchable employee registry with quota validation.
- `POST /import/csv` — LMS/CSV batch ingestion with automated certificate issuance.
- `GET /documents` — Compliance gazettes and statutory policies.
- `GET /audit-logs` — Tenant audit log trail.
