from typing import List, Set, Dict
from sqlalchemy.orm import Session
from app.models.models import User, Role, Permission, RolePermission, UserRole

# Canonical Workspace Identifiers (Customer-neutral internal mapping)
WORKSPACE_MAP: Dict[str, str] = {
    "SUPER_ADMIN": "INTERNAL_PLATFORM",
    "PLATFORM_ADMIN": "INTERNAL_PLATFORM",
    "PARTNER_ADMIN": "PARTNER_WORKSPACE",
    "MIDDLEMAN_ADMIN": "PARTNER_WORKSPACE",
    "PARTNER_OPERATIONS": "PARTNER_WORKSPACE",
    "PARTNER_SALES": "PARTNER_WORKSPACE",
    "PARTNER_VIEWER": "PARTNER_WORKSPACE",
    "COMPANY_ADMIN": "CLIENT_HR_WORKSPACE",
    "HR_ADMIN": "CLIENT_HR_WORKSPACE",
    "HR_MANAGER": "CLIENT_HR_WORKSPACE",
    "COMPLIANCE_OFFICER": "CLIENT_HR_WORKSPACE",
    "IC_MEMBER": "IC_WORKSPACE",
    "EMPLOYEE": "LEARNER_WORKSPACE",
}

# Granular Permission Matrix (Deny-by-default)
ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    "SUPER_ADMIN": {
        "platform.organisations.read",
        "platform.organisations.create",
        "platform.organisations.update",
        "platform.organisations.suspend",
        "platform.users.manage",
        "platform.subscriptions.manage",
        "platform.analytics.read",
        "platform.audit.read",
        "platform.supervision.read",
        "company.employees.read",
        "company.employees.create",
        "company.employees.import",
        "company.training.assign",
        "company.reports.export",
        "company.branding.manage",
        "company.settings.manage",
        "company.users.manage",
        "company.billing.manage",
        "ic.members.manage",
        "partner.clients.read",
        "partner.clients.create",
        "partner.licences.allocate",
        "partner.licences.revoke",
        "partner.branding.manage",
        "partner.reports.read",
    },
    "PLATFORM_ADMIN": {
        "platform.organisations.read",
        "platform.organisations.create",
        "platform.organisations.update",
        "platform.organisations.suspend",
        "platform.users.manage",
        "platform.subscriptions.manage",
        "platform.analytics.read",
        "platform.audit.read",
        "platform.supervision.read",
        "company.employees.read",
        "company.employees.create",
        "company.employees.import",
        "company.training.assign",
        "company.reports.export",
        "company.branding.manage",
        "company.settings.manage",
        "company.users.manage",
        "company.billing.manage",
        "ic.members.manage",
    },
    "PARTNER_ADMIN": {
        "partner.clients.create",
        "partner.clients.read",
        "partner.licences.allocate",
        "partner.licences.revoke",
        "partner.branding.manage",
        "partner.reports.read",
        "partner.billing.manage",
        "partner.team.manage",
        "company.employees.read",
        "company.reports.export",
    },
    "MIDDLEMAN_ADMIN": {
        "partner.clients.create",
        "partner.clients.read",
        "partner.licences.allocate",
        "partner.licences.revoke",
        "partner.branding.manage",
        "partner.reports.read",
    },
    "PARTNER_OPERATIONS": {
        "partner.clients.create",
        "partner.clients.read",
        "partner.licences.allocate",
        "partner.reports.read",
    },
    "PARTNER_SALES": {
        "partner.clients.read",
        "partner.reports.read",
    },
    "PARTNER_VIEWER": {
        "partner.clients.read",
        "partner.reports.read",
    },
    "COMPANY_ADMIN": {
        "company.employees.read",
        "company.employees.create",
        "company.training.assign",
        "company.reports.export",
        "company.branding.manage",
        "company.settings.manage",
        "company.users.manage",
        "company.billing.manage",
        "ic.members.manage",
        # Notice: Confidential grievance content access (ic.grievances.read) is NOT granted automatically!
    },
    "HR_ADMIN": {
        "company.employees.read",
        "company.employees.create",
        "company.training.assign",
        "company.reports.export",
        "company.branding.manage",
        "company.settings.manage",
        "company.users.manage",
        "company.billing.manage",
        "ic.members.manage",
    },
    "HR_MANAGER": {
        "company.employees.read",
        "company.employees.create",
        "company.training.assign",
        "company.reports.export",
    },
    "COMPLIANCE_OFFICER": {
        "company.employees.read",
        "company.reports.export",
        "company.settings.manage",
        "ic.members.manage",
    },
    "IC_MEMBER": {
        "ic.grievances.read",
        "ic.grievances.update",
        "ic.members.manage",
        "company.reports.export",
    },
    "EMPLOYEE": {
        "learner.training.read",
        "learner.assessment.submit",
        "learner.certificate.read",
        "learner.grievance.submit",
    },
}

# Clean customer-facing navigation items per workspace
WORKSPACE_NAVIGATION: Dict[str, List[str]] = {
    "INTERNAL_PLATFORM": [
        "overview", "partners", "companies", "users", "subscriptions", "health", "audit"
    ],
    "PARTNER_WORKSPACE": [
        "clients", "licences", "branding"
    ],
    "CLIENT_HR_WORKSPACE": [
        "dashboard", "employees", "webinars", "departments", "compliance", "ic-members", "integrations", "branding", "settings", "audit"
    ],
    "IC_WORKSPACE": [
        "complaints", "ic-members", "compliance"
    ],
    "LEARNER_WORKSPACE": [
        "modules", "assessment", "certificate", "grievance"
    ],
}


def resolve_workspace(role: str) -> str:
    return WORKSPACE_MAP.get(role, "CLIENT_HR_WORKSPACE")


def resolve_navigation(role: str) -> List[str]:
    workspace = resolve_workspace(role)
    return WORKSPACE_NAVIGATION.get(workspace, ["dashboard"])


def get_user_permissions(user: User, db: Session) -> List[str]:
    """
    Combines role-matrix permissions with any database-backed UserRole / RolePermission grants
    scoped to the user's organisation.
    """
    perms: Set[str] = set(ROLE_PERMISSIONS.get(user.role, set()))

    # Load DB-assigned UserRole overrides if present
    db_user_roles = db.query(UserRole).filter(UserRole.user_id == user.id).all()
    if db_user_roles:
        role_ids = [ur.role_id for ur in db_user_roles]
        db_perms = (
            db.query(Permission.permission_key)
            .join(RolePermission, RolePermission.permission_id == Permission.id)
            .filter(RolePermission.role_id.in_(role_ids))
            .all()
        )
        for (pkey,) in db_perms:
            perms.add(pkey)

    return sorted(perms)


def user_has_permission(user: User, permission_key: str, db: Session) -> bool:
    return permission_key in get_user_permissions(user, db)

