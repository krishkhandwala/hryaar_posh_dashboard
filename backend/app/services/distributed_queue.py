import json
import uuid
import threading
from datetime import datetime
from typing import Dict, Any, Optional, Callable
from concurrent.futures import ThreadPoolExecutor
from app.core.config import settings


class DistributedTaskManager:
    """
    Tier 2 Asynchronous Distributed Task Queue.
    Stores job state in PostgreSQL `cluster_jobs` (plus L1 mirror) so jobs submitted on
    one load-balanced worker node can be polled cleanly from any other worker node.
    """
    def __init__(self, max_workers: int = 8):
        self.executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="posh_worker")
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        self.completed_count = 0
        self.failed_count = 0

    def _persist_upsert(self, job_dict: Dict[str, Any]):
        try:
            from app.db.session import SessionLocal
            from app.models.models import ClusterJob

            db = SessionLocal()
            try:
                row = db.query(ClusterJob).filter(ClusterJob.id == job_dict["id"]).first()
                res_json = json.dumps(job_dict["result"]) if job_dict.get("result") is not None else None
                if row:
                    row.status = job_dict["status"]
                    row.progress_pct = job_dict["progress_pct"]
                    row.result_json = res_json
                    row.error = job_dict.get("error")
                    row.started_at = datetime.fromisoformat(job_dict["started_at"]) if job_dict.get("started_at") else None
                    row.completed_at = datetime.fromisoformat(job_dict["completed_at"]) if job_dict.get("completed_at") else None
                else:
                    db.add(ClusterJob(
                        id=job_dict["id"],
                        job_type=job_dict["job_type"],
                        company_id=job_dict.get("company_id"),
                        user_id=job_dict.get("user_id"),
                        status=job_dict["status"],
                        progress_pct=job_dict["progress_pct"],
                        result_json=res_json,
                        error=job_dict.get("error"),
                        node_id=job_dict.get("node_id"),
                        created_at=datetime.fromisoformat(job_dict["created_at"]),
                    ))
                db.commit()
            finally:
                db.close()
        except Exception:
            pass

    @staticmethod
    def _row_to_dict(row) -> Dict[str, Any]:
        return {
            "id": row.id,
            "job_type": row.job_type,
            "company_id": row.company_id,
            "user_id": row.user_id,
            "status": row.status,
            "progress_pct": row.progress_pct,
            "result": json.loads(row.result_json) if row.result_json else None,
            "error": row.error,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "started_at": row.started_at.isoformat() if row.started_at else None,
            "completed_at": row.completed_at.isoformat() if row.completed_at else None,
            "node_id": row.node_id,
        }

    def submit_job(
        self,
        job_type: str,
        company_id: Optional[str],
        user_id: Optional[str],
        task_func: Callable,
        *args,
        **kwargs
    ) -> str:
        job_id = f"job-{uuid.uuid4().hex[:12]}"
        now = datetime.utcnow().isoformat()

        job_dict = {
            "id": job_id,
            "job_type": job_type,
            "company_id": company_id,
            "user_id": user_id,
            "status": "QUEUED",
            "progress_pct": 0.0,
            "result": None,
            "error": None,
            "created_at": now,
            "started_at": None,
            "completed_at": None,
            "node_id": settings.CLUSTER_NODE_ID
        }

        with self._lock:
            self._jobs[job_id] = job_dict
        self._persist_upsert(job_dict)

        self.executor.submit(self._run_job, job_id, task_func, *args, **kwargs)
        return job_id

    def _run_job(self, job_id: str, task_func: Callable, *args, **kwargs):
        with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id]["status"] = "PROCESSING"
                self._jobs[job_id]["started_at"] = datetime.utcnow().isoformat()
                self._jobs[job_id]["progress_pct"] = 10.0
                snap = dict(self._jobs[job_id])
            else:
                snap = None
        if snap:
            self._persist_upsert(snap)

        try:
            def progress_updater(pct: float):
                with self._lock:
                    if job_id in self._jobs:
                        self._jobs[job_id]["progress_pct"] = min(99.0, pct)
                        psnap = dict(self._jobs[job_id])
                    else:
                        psnap = None
                if psnap and int(pct) in (30, 60, 90):
                    self._persist_upsert(psnap)

            result = task_func(*args, progress_callback=progress_updater, **kwargs)

            with self._lock:
                if job_id in self._jobs:
                    self._jobs[job_id]["status"] = "COMPLETED"
                    self._jobs[job_id]["progress_pct"] = 100.0
                    self._jobs[job_id]["result"] = result
                    self._jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()
                    self.completed_count += 1
                    snap = dict(self._jobs[job_id])
                else:
                    snap = None
            if snap:
                self._persist_upsert(snap)
                try:
                    from app.db.session import SessionLocal
                    from app.services.event_bus import publish_realtime_event
                    with SessionLocal() as edb:
                        publish_realtime_event(
                            db=edb,
                            event_type="BATCH_JOB_COMPLETED",
                            title="Cluster Task Finished",
                            message=f"Job {job_id} ({snap.get('job_type')}) processed successfully.",
                            company_id=snap.get("company_id"),
                            user_id=snap.get("user_id"),
                            payload={"job_id": job_id, "job_type": snap.get("job_type")}
                        )
                except Exception:
                    pass
        except Exception as e:
            with self._lock:
                if job_id in self._jobs:
                    self._jobs[job_id]["status"] = "FAILED"
                    self._jobs[job_id]["error"] = str(e)
                    self._jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()
                    self.failed_count += 1
                    snap = dict(self._jobs[job_id])
                else:
                    snap = None
            if snap:
                self._persist_upsert(snap)
                try:
                    from app.db.session import SessionLocal
                    from app.services.event_bus import publish_realtime_event
                    with SessionLocal() as edb:
                        publish_realtime_event(
                            db=edb,
                            event_type="BATCH_JOB_COMPLETED",
                            title="Cluster Task Finished",
                            message=f"Job {job_id} ({snap.get('job_type')}) processed successfully.",
                            company_id=snap.get("company_id"),
                            user_id=snap.get("user_id"),
                            payload={"job_id": job_id, "job_type": snap.get("job_type")}
                        )
                except Exception:
                    pass

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        try:
            from app.db.session import SessionLocal
            from app.models.models import ClusterJob

            db = SessionLocal()
            try:
                row = db.query(ClusterJob).filter(ClusterJob.id == job_id).first()
                if row:
                    return self._row_to_dict(row)
            finally:
                db.close()
        except Exception:
            pass

        with self._lock:
            return self._jobs.get(job_id)

    def list_jobs(self, company_id: Optional[str] = None, limit: int = 20) -> list:
        try:
            from app.db.session import SessionLocal
            from app.models.models import ClusterJob

            db = SessionLocal()
            try:
                q = db.query(ClusterJob)
                if company_id:
                    q = q.filter(ClusterJob.company_id == company_id)
                rows = q.order_by(ClusterJob.created_at.desc()).limit(limit).all()
                if rows:
                    return [self._row_to_dict(r) for r in rows]
            finally:
                db.close()
        except Exception:
            pass

        with self._lock:
            jobs = list(self._jobs.values())
            if company_id:
                jobs = [j for j in jobs if j.get("company_id") == company_id]
            jobs.sort(key=lambda x: x["created_at"], reverse=True)
            return jobs[:limit]

    def get_queue_telemetry(self) -> Dict[str, Any]:
        try:
            from app.db.session import SessionLocal
            from app.models.models import ClusterJob

            db = SessionLocal()
            try:
                active = db.query(ClusterJob).filter(ClusterJob.status.in_(["QUEUED", "PROCESSING"])).count()
                completed = db.query(ClusterJob).filter(ClusterJob.status == "COMPLETED").count()
                failed = db.query(ClusterJob).filter(ClusterJob.status == "FAILED").count()
                total = db.query(ClusterJob).count()
                return {
                    "active_queue_depth": active,
                    "total_completed": max(completed, self.completed_count),
                    "total_failed": max(failed, self.failed_count),
                    "total_submitted": max(total, len(self._jobs)),
                    "active_workers": settings.WORKER_CONCURRENCY,
                    "cluster_node_id": settings.CLUSTER_NODE_ID,
                    "persistence": "POSTGRES_SHARED_QUEUE",
                }
            finally:
                db.close()
        except Exception:
            pass

        with self._lock:
            active_jobs = [j for j in self._jobs.values() if j["status"] in ["QUEUED", "PROCESSING"]]
            return {
                "active_queue_depth": len(active_jobs),
                "total_completed": self.completed_count,
                "total_failed": self.failed_count,
                "total_submitted": len(self._jobs),
                "active_workers": settings.WORKER_CONCURRENCY,
                "cluster_node_id": settings.CLUSTER_NODE_ID,
                "persistence": "MEMORY_FALLBACK",
            }


# Singleton worker queue
task_queue = DistributedTaskManager(max_workers=settings.WORKER_CONCURRENCY)
