import json
import logging
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, AsyncGenerator, List
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.models import ClusterEvent
from app.core.config import settings

logger = logging.getLogger("cluster.event_bus")

def publish_realtime_event(
    db: Session,
    event_type: str,
    title: str,
    message: str,
    company_id: Optional[str] = None,
    user_id: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
) -> Optional[ClusterEvent]:
    """
    Persists a real-time cluster event to PostgreSQL.
    All connected SSE streams across all load-balanced API nodes pick this up
    and immediately stream it to client browsers without manual refreshes.
    """
    try:
        event = ClusterEvent(
            event_type=event_type,
            title=title,
            message=message,
            company_id=company_id,
            user_id=user_id,
            payload_json=json.dumps(payload or {}),
            node_id=settings.CLUSTER_NODE_ID,
            created_at=datetime.utcnow()
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        logger.info(f"Published real-time event [{event.id}] {event_type}: {title} (company={company_id})")
        return event
    except Exception as e:
        logger.error(f"Failed to publish real-time event: {e}")
        try:
            db.rollback()
        except Exception:
            pass
        return None


def get_recent_events(
    db: Session,
    user_company_id: Optional[str],
    user_role: str,
    limit: int = 20
) -> List[Dict[str, Any]]:
    """Fetch the most recent events scoped by multi-tenant role."""
    query = db.query(ClusterEvent)
    if user_role not in ["SUPER_ADMIN", "PARTNER_ADMIN"]:
        if user_company_id:
            query = query.filter(
                (ClusterEvent.company_id == user_company_id) | 
                (ClusterEvent.company_id.is_(None))
            )
        else:
            query = query.filter(ClusterEvent.company_id.is_(None))
    
    events = query.order_by(ClusterEvent.id.desc()).limit(limit).all()
    results = []
    for ev in events:
        payload = {}
        if ev.payload_json:
            try:
                payload = json.loads(ev.payload_json)
            except Exception:
                payload = {}
        results.append({
            "id": ev.id,
            "event_id": ev.event_id,
            "type": ev.event_type,
            "title": ev.title,
            "message": ev.message,
            "company_id": ev.company_id,
            "user_id": ev.user_id,
            "node_id": ev.node_id,
            "created_at": ev.created_at.isoformat() if ev.created_at else datetime.utcnow().isoformat(),
            "payload": payload
        })
    return results


async def sse_event_generator(
    user_id: str,
    user_company_id: Optional[str],
    user_role: str,
    last_event_id: int = 0
) -> AsyncGenerator[str, None]:
    """
    Long-lived Server-Sent Events generator.
    Streams new cluster events to the connected browser.
    Ensures multi-tenant data isolation:
    - SUPER_ADMIN receives all system and tenant events.
    - PARTNER_ADMIN receives partner and client events.
    - COMPANY_ADMIN / HR / IC / Learner receives company events or broadcasts.
    """
    current_id = last_event_id
    heartbeat_counter = 0

    # Initial connect: if last_event_id is 0, give the last 5 events
    with SessionLocal() as db:
        if current_id == 0:
            latest = db.query(ClusterEvent.id).order_by(ClusterEvent.id.desc()).first()
            if latest:
                current_id = max(0, latest[0] - 5)

    try:
        while True:
            events_to_send = []
            with SessionLocal() as db:
                query = db.query(ClusterEvent).filter(ClusterEvent.id > current_id)
                
                if user_role not in ["SUPER_ADMIN", "PARTNER_ADMIN"]:
                    if user_company_id:
                        query = query.filter(
                            (ClusterEvent.company_id == user_company_id) | 
                            (ClusterEvent.company_id.is_(None))
                        )
                    else:
                        query = query.filter(ClusterEvent.company_id.is_(None))
                
                events = query.order_by(ClusterEvent.id.asc()).limit(50).all()
                for ev in events:
                    payload = {}
                    if ev.payload_json:
                        try:
                            payload = json.loads(ev.payload_json)
                        except Exception:
                            payload = {}
                    
                    events_to_send.append({
                        "id": ev.id,
                        "event_id": ev.event_id,
                        "type": ev.event_type,
                        "title": ev.title,
                        "message": ev.message,
                        "company_id": ev.company_id,
                        "user_id": ev.user_id,
                        "node_id": ev.node_id,
                        "created_at": ev.created_at.isoformat() if ev.created_at else datetime.utcnow().isoformat(),
                        "payload": payload
                    })
                    current_id = max(current_id, ev.id)

            for item in events_to_send:
                data_str = json.dumps(item)
                yield f"id: {item['id']}\nevent: {item['type']}\ndata: {data_str}\n\n"

            # Send heartbeat ping every 15 seconds to prevent client-side socket timeouts
            heartbeat_counter += 1
            if heartbeat_counter >= 15:
                heartbeat_counter = 0
                yield f": heartbeat ping at {datetime.utcnow().isoformat()}\n\n"

            await asyncio.sleep(1.0)
    except asyncio.CancelledError:
        logger.info(f"SSE stream closed for user {user_id}")
        return

