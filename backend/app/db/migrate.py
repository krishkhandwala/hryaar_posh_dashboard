from sqlalchemy import text
from app.db.session import engine, Base
import app.models.models  # noqa: F401 - register all SQLAlchemy models on Base.metadata before create_all

def run_migrations():
    """
    Self-healing migration runner that ensures all schema modifications, 
    new tables, and new columns exist on both SQLite and PostgreSQL
    without dropping or modifying existing operational data.
    """
    # 1. Create all newly defined tables if they do not exist
    Base.metadata.create_all(bind=engine)

    # 2. Inspect and dynamically add missing columns to existing tables
    is_sqlite = "sqlite" in str(engine.url)

    with engine.connect() as conn:
        # Check companies table columns
        if is_sqlite:
            existing_cols_comp = [row[1] for row in conn.execute(text("PRAGMA table_info(companies)")).fetchall()]
        else:
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='companies'"))
            existing_cols_comp = [row[0] for row in res.fetchall()]

        company_cols = [
            ("favicon_url", "VARCHAR(500)", "NULL"),
            ("description", "TEXT", "NULL"),
            ("contact_email", "VARCHAR(255)", "NULL"),
            ("contact_number", "VARCHAR(50)", "NULL"),
            ("status", "VARCHAR(50)", "'ACTIVE'"),
            ("primary_color", "VARCHAR(20)", "'#2A62FF'"),
            ("secondary_color", "VARCHAR(20)", "'#1D4ED8'"),
            ("accent_color", "VARCHAR(20)", "'#F59E0B'"),
            ("sidebar_color", "VARCHAR(20)", "'#061122'"),
            ("welcome_message", "VARCHAR(500)", "'Welcome to HRYAAR Digi-PoSH'"),
            ("subscription_plan_id", "VARCHAR", "NULL"),
            ("subscription_status", "VARCHAR(50)", "'ACTIVE'"),
            ("company_type", "VARCHAR(50)", "'CLIENT'"),
            ("partner_id", "VARCHAR(100)", "NULL"),
            ("partner_name", "VARCHAR(255)", "NULL"),
            ("partner_logo_url", "VARCHAR(500)", "NULL"),
            ("co_branding_mode", "VARCHAR(50)", "'CO_BRANDED'"),
            ("assigned_seat_quota", "INTEGER", "1500")
        ]

        for col_name, col_type, default_val in company_cols:
            if col_name not in existing_cols_comp:
                conn.execute(text(f"ALTER TABLE companies ADD COLUMN {col_name} {col_type} DEFAULT {default_val}"))

        # Check users table columns
        if is_sqlite:
            existing_cols_user = [row[1] for row in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
        else:
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='users'"))
            existing_cols_user = [row[0] for row in res.fetchall()]

        dt_type = "DATETIME" if is_sqlite else "TIMESTAMP"
        bool_true = "1" if is_sqlite else "TRUE"

        user_cols = [
            ("designation", "VARCHAR(150)", "'Corporate Administrator'"),
            ("phone", "VARCHAR(50)", "NULL"),
            ("status", "VARCHAR(50)", "'ACTIVE'"),
            ("updated_at", dt_type, "NULL")
        ]

        for col_name, col_type, default_val in user_cols:
            if col_name not in existing_cols_user:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type} DEFAULT {default_val}"))

        # Check audit_logs table columns
        if is_sqlite:
            existing_cols_audit = [row[1] for row in conn.execute(text("PRAGMA table_info(audit_logs)")).fetchall()]
        else:
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='audit_logs'"))
            existing_cols_audit = [row[0] for row in res.fetchall()]

        audit_cols = [
            ("actor_user_id", "VARCHAR", "NULL"),
            ("entity_type", "VARCHAR(100)", "NULL"),
            ("entity_id", "VARCHAR(100)", "NULL")
        ]

        for col_name, col_type, default_val in audit_cols:
            if col_name not in existing_cols_audit:
                conn.execute(text(f"ALTER TABLE audit_logs ADD COLUMN {col_name} {col_type} DEFAULT {default_val}"))

        # Check webinars table columns
        if is_sqlite:
            existing_cols_webinars = [row[1] for row in conn.execute(text("PRAGMA table_info(webinars)")).fetchall()]
        else:
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='webinars'"))
            existing_cols_webinars = [row[0] for row in res.fetchall()]

        webinar_cols = [
            ("auto_reminder_7d_enabled", "BOOLEAN", bool_true),
            ("auto_reminder_2d_enabled", "BOOLEAN", bool_true),
            ("reminder_7d_sent_at", dt_type, "NULL"),
            ("reminder_2d_sent_at", dt_type, "NULL"),
            ("last_broadcast_email_sent_at", dt_type, "NULL"),
            ("total_emails_dispatched", "INTEGER", "0")
        ]

        for col_name, col_type, default_val in webinar_cols:
            if col_name not in existing_cols_webinars:
                conn.execute(text(f"ALTER TABLE webinars ADD COLUMN {col_name} {col_type} DEFAULT {default_val}"))

        # Check roles table columns (Phase 1 RBAC evolution)
        if is_sqlite:
            existing_cols_roles = [row[1] for row in conn.execute(text("PRAGMA table_info(roles)")).fetchall()]
        else:
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='roles'"))
            existing_cols_roles = [row[0] for row in res.fetchall()]

        if "organisation_id" not in existing_cols_roles:
            conn.execute(text("ALTER TABLE roles ADD COLUMN organisation_id VARCHAR REFERENCES companies(id) ON DELETE CASCADE"))

        # Check user_sessions table columns (IP + User-Agent tracking for active sessions UI)
        if is_sqlite:
            existing_cols_sess = [row[1] for row in conn.execute(text("PRAGMA table_info(user_sessions)")).fetchall()]
        else:
            res = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='user_sessions'"))
            existing_cols_sess = [row[0] for row in res.fetchall()]

        for col_name, col_type in [("ip_address", "VARCHAR(64)"), ("user_agent", "VARCHAR(255)")]:
            if col_name not in existing_cols_sess:
                conn.execute(text(f"ALTER TABLE user_sessions ADD COLUMN {col_name} {col_type} DEFAULT NULL"))

        # Ensure helpful composite/lookup indexes exist
        index_stmts = [
            "CREATE INDEX IF NOT EXISTS idx_companies_partner_id ON companies (partner_id)",
            "CREATE INDEX IF NOT EXISTS idx_users_company_id ON users (company_id)",
            "CREATE INDEX IF NOT EXISTS idx_users_company_role ON users (company_id, role)",
            "CREATE INDEX IF NOT EXISTS idx_employees_company_dept ON employees (company_id, department)",
            "CREATE INDEX IF NOT EXISTS idx_employees_company_status ON employees (company_id, training_status)",
            "CREATE INDEX IF NOT EXISTS idx_audit_company_created ON audit_logs (company_id, created_at)",
            "CREATE INDEX IF NOT EXISTS idx_payments_company_created ON payment_transactions (company_id, created_at)",
            "CREATE INDEX IF NOT EXISTS idx_user_sessions_user_revoked ON user_sessions (user_id, is_revoked)",
            "CREATE INDEX IF NOT EXISTS idx_cluster_jobs_company_created ON cluster_jobs (company_id, created_at)",
        ]
        for stmt in index_stmts:
            conn.execute(text(stmt))

        conn.commit()
