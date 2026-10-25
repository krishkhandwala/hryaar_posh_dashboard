# HRYAAR Digi-PoSH — Complete Master User Guide, Technical Architecture & Integration Manual

> **Awareness | Respect | Safer Workplaces**  
> *Statutory Compliance & Multi-Tenant Training Management System for the Prevention of Sexual Harassment (PoSH) at Workplace Act, 2013.*

---

## 1. Executive Summary & Core Platform Features

**HRYAAR Digi-PoSH** is an enterprise-grade B2B SaaS platform engineered for multi-tenant monitoring of employee PoSH sensitization and training. It enables corporate HR teams and HRYAAR platform operators to track compliance, ingest LMS/training data (Leap10x), run assessments, issue tamper-evident certificates, and export audit trails for statutory filings.

### Key Features Matrix

| Module | Feature | Business Value / Capability |
| :--- | :--- | :--- |
| **Multi-Tenancy** | Strict Tenant Isolation | Encrypted data scoping per `company_id`. Zero risk of cross-tenant data leakage. |
| **Authentication** | Role-Based Access Control (RBAC) | Distinguishes `PLATFORM_ADMIN`, `HR_ADMIN`, and `AUDITOR` permissions. |
| **Analytics** | Executive KPI Dashboard | Instant metrics: Total Cohort, Training %, Assessment %, Certificate Issuance %. |
| **Visual Charts** | Departmental & Score Distributions | Department progress bar charts and score band distribution donut charts. |
| **Roadmap** | 5-Stage Implementation Tracker | Tracks Training Videos, Awareness Material, Interactive Webinars, Assessment, Certification. |
| **Workshops** | IC Sensitization & Webinars | Integrated schedule of legal webinars and IC workshops with enrollment counters. |
| **Employee Registry** | Searchable Compliance Audit Table | Live filtering by department and keyword search; dynamic audit trail. |
| **Reporting** | 1-Click Statutory CSV Export | Ready-to-file CSV data export for annual IC and district officer compliance filings. |
| **Data Ingestion** | Robust CSV Ingestion Engine | Ingests LMS/training logs, normalizes headers, and updates database records in transactions. |
| **Integrations** | Extensible Leap10x API Adapter | Clean decoupled architecture ready for direct webhook/REST sync with Leap10x. |
| **Legal Safety** | Persistent PoSH IC Resource Channel | Unobtrusive, persistent portal link for confidential employee filings to the IC. |

---

## 2. Multi-Tenant Architecture & Data Security

### Architecture Principles
- **Single Database, Strict Logical Partitioning**: All tenant records belong to a specific tenant via `company_id`.
- **Server-Derived Context**: Tenant identity is resolved solely from verified cryptographic JWT bearer tokens on the server.
- **Fail-Safe Access Guard**: Any attempt by Company A's HR admin to access Company B's records via query params, body params, or ID spoofing triggers an immediate `403 Forbidden` response and an audit log event.

### Database Schema Entity Relationship
```
+---------------+        1:N        +------------------+
|   companies   |-------------------|     employees    |
+---------------+                   +------------------+
  |       | 1:N                       | 1:N       | 1:N
  |       +-------+                   |           |
  | 1:N           | 1:N               v           v
  v               v           +--------------+  +--------------------+
+-------+   +-----------+     | tr_records   |  | assessment_records |
| users |   | webinars  |     +--------------+  +--------------------+
+-------+   +-----------+
  | 1:N
  v
+------------+
| audit_logs |
+------------+
```

---

## 3. Step-by-Step Integration Guide (Leap10x & CSV Imports)

### Phase 1: Tabular CSV Ingestion (Active & Production Ready)
Organizations tracking progress through LMS platforms (like Leap10x) can upload exported CSV files anytime.

#### Expected CSV Header Formats
The ingestion service automatically tolerates common LMS column variations:

| System Field | Accepted CSV Header Aliases | Format Example | Mandatory |
| :--- | :--- | :--- | :--- |
| `employee_code` | `emp_id`, `employee_id`, `employee_code`, `code` | `ACM-1025` | **Yes** |
| `email` | `email`, `official_email`, `work_email` | `user@company.com` | **Yes** |
| `name` | `full_name`, `name`, or `first_name` + `last_name` | `Priya Sharma` | Optional |
| `department` | `department`, `dept`, `business_unit` | `Engineering` | Optional |
| `progress` | `progress`, `training_progress`, `completion` | `100` or `100%` | Optional |
| `score` | `score`, `assessment_score`, `marks` | `88` or `88.5` | Optional |

#### How Ingestion Works
1. Navigate to the top navigation bar and click **Import CSV Data**.
2. Select or drag your CSV file.
3. Click **Ingest & Validate CSV**.
4. The backend opens a transactional batch:
   - Matches existing employee codes or creates new employee records within the tenant.
   - Calculates milestone status: Progress ≥ 100% marks `COMPLETED`; Score ≥ 70% marks `PASSED`.
   - Generates unique tamper-evident certificate IDs (`CERT-{COMP}-{CODE}`).
   - Writes an immutable record to `audit_logs`.

---

### Phase 2: Live Leap10x API / Webhook Architecture (Planned Adapter)

To connect Leap10x directly without manual CSV uploads, the backend contains an extensible interface schema:

```python
# backend/app/services/leap10x_adapter.py (Interface Specification)

class Leap10xIntegrationAdapter:
    """
    Decoupled adapter ready for live webhook ingestion or scheduled cron pulls
    once Leap10x API credentials and endpoints are formally provisioned.
    """
    def __init__(self, api_key: str, client_secret: str, tenant_company_id: str):
        self.api_key = api_key
        self.tenant_company_id = tenant_company_id

    async def handle_webhook_event(self, event_type: str, payload: dict):
        # Event: 'course.completed' or 'assessment.submitted'
        pass

    async def fetch_delta_progress(self, since_timestamp: str):
        # Scheduled batch sync
        pass
```

---

## 4. End-to-End Setup Guide (Local & Production)

### Prerequisites
- **Python**: Version 3.10, 3.11, or 3.12
- **Node.js**: Version 18.x, 20.x, or 22.x
- **Git**

### Backend Setup

```powershell
# 1. Open terminal and navigate to backend
cd "C:\Users\Krish Khandwala\hryaar_posh_dashboard\backend"

# 2. Activate virtual environment
.\venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Initialize database & seed test companies (Acme 1,250 & Beta 600)
python -m app.db.seed

# 5. Run automated multi-tenant unit tests
pytest app/tests

# 6. Start FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8001
```

Backend API Swagger documentation will be available at:  
👉 **http://127.0.0.1:8001/docs**

---

### Frontend Setup

```powershell
# 1. Open a new terminal and navigate to frontend
cd "C:\Users\Krish Khandwala\hryaar_posh_dashboard\frontend"

# 2. Install dependencies (if fresh clone)
npm install

# 3. Start Next.js development server
npm run dev -- -p 3001
```

Access the frontend application at:  
👉 **http://localhost:3001**

---

## 5. User Guide: Operating the Dashboard

### 1. Logging In
Visit `http://localhost:3001`. Use the instant demo selectors or enter credentials:

| Tenant / Persona | Email | Password | Scope & Description |
| :--- | :--- | :--- | :--- |
| **Acme Corp HR Admin** | `hr@acme.com` | `Acme@1234` | Manages 1,250 employees across 6 departments |
| **Beta Industries HR Admin** | `hr@beta.com` | `Beta@1234` | Manages 600 employees |
| **Platform Super Admin** | `superadmin@hryaar.com` | `Admin@1234` | Global administration and multi-company switcher |

### 2. Monitoring Corporate Compliance
- **KPI Summary Cards**: Review the 4 high-level metrics at a glance.
- **Department Completion Bar Chart**: Identify lagging teams requiring compliance nudges.
- **Assessment Bands**: Verify employee comprehension (Distinction, Passed, Needs Review, Failed).
- **Upcoming IC Sessions**: View upcoming sensitization workshops and registered participant tallies.

### 3. Managing Employee Records & Exporting
- Use the **Search Bar** to instantly find an employee by Name, Employee Code, or Email.
- Filter by specific **Department** (e.g., Engineering, Finance, HR).
- Click **Export CSV** to download a clean, structured report for legal audit preparation.

### 4. PoSH IC Support Link
The bottom of the left sidebar contains the **PoSH IC Channel** card, offering immediate and confidential access to the company's Internal Committee presiding officer.
