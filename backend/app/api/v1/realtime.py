from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import get_db, SessionLocal
from app.models.models import User
from app.core.deps import get_current_user
from app.services.event_bus import sse_event_generator, get_recent_events, publish_realtime_event
from pydantic import BaseModel

router = APIRouter()

class BroadcastRequest(BaseModel):
    title: str
    message: str
    event_type: str = "SYSTEM_BROADCAST"
    company_id: Optional[str] = None


def _extract_role_code(user: User) -> str:
    if hasattr(user, "role") and user.role:
        if isinstance(user.role, str):
            return user.role
        return getattr(user.role, "code", "USER")
    return "USER"


def resolve_user_from_token_or_param(
    token_query: Optional[str] = Query(None, alias="token"),
    auth_header: Optional[str] = Header(None, alias="authorization"),
) -> dict:
    """
    Extracts and authenticates user identity from Authorization header or ?token= query param.
    Returns basic user context dict {id, company_id, role_code} without holding DB session open.
    """
    raw_token = None
    if auth_header and auth_header.startswith("Bearer "):
        raw_token = auth_header.split(" ", 1)[1].strip()
    elif token_query:
        raw_token = token_query.strip()
    
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required for real-time stream"
        )
    
    try:
        payload = jwt.decode(raw_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
    
    with SessionLocal() as db:
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active or user.status == "SUSPENDED":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive or suspended user account")
        
        role_code = _extract_role_code(user)
        return {
            "id": user.id,
            "company_id": user.company_id,
            "role_code": role_code,
            "full_name": user.full_name or user.email,
        }


@router.get("/stream")
async def stream_cluster_events(
    last_event_id: int = Query(0, alias="last_event_id"),
    header_last_event_id: Optional[str] = Header(None, alias="Last-Event-ID"),
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None),
):
    """
    Server-Sent Events endpoint streaming real-time multi-tenant cluster events.
    Supports native browser EventSource reconnects and Last-Event-ID resumption.
    """
    effective_last_id = last_event_id
    if header_last_event_id and header_last_event_id.isdigit():
        effective_last_id = max(effective_last_id, int(header_last_event_id))

    user_info = resolve_user_from_token_or_param(token, authorization)

    return StreamingResponse(
        sse_event_generator(
            user_id=user_info["id"],
            user_company_id=user_info["company_id"],
            user_role=user_info["role_code"],
            last_event_id=effective_last_id
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.get("/recent")
def list_recent_events(
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch the latest real-time events for notification trays and initial render."""
    role_code = _extract_role_code(current_user)
    events = get_recent_events(db, current_user.company_id, role_code, limit=limit)
    return {"events": events, "count": len(events)}


@router.post("/broadcast")
def broadcast_admin_event(
    req: BroadcastRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Platform Super Admin or Company Admin broadcast."""
    role_code = _extract_role_code(current_user)
    if role_code not in ["SUPER_ADMIN", "PLATFORM_ADMIN", "PARTNER_ADMIN"]:
        if role_code != "COMPANY_ADMIN":
            raise HTTPException(status_code=403, detail="Insufficient privileges to broadcast events")
        target_company_id = current_user.company_id
    else:
        target_company_id = req.company_id

    event = publish_realtime_event(
        db=db,
        event_type=req.event_type,
        title=req.title,
        message=req.message,
        company_id=target_company_id,
        user_id=current_user.id,
        payload={"broadcast_by": current_user.full_name or current_user.email}
    )
    if not event:
        raise HTTPException(status_code=500, detail="Failed to publish event")
    return {"message": "Event broadcast successfully", "event_id": event.event_id}
