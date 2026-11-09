import uuid
import time
import threading
from datetime import datetime
from typing import Dict, Any, Optional, Callable
from concurrent.futures import ThreadPoolExecutor
from app.core.config import settings

class DistributedTaskManager:
    """
    Tier 2 Asynchronous Distributed Task Queue.
    Manages background jobs (PDF generation, bulk employee imports, LMS batch syncs)
    with status tracking, progress percentage, error isolation, and results retrieval.
    """
    def __init__(self, max_workers: int = 8):
        self.executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="posh_worker")
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        self.completed_count = 0
        self.failed_count = 0

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
        
        with self._lock:
            self._jobs[job_id] = {
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

        self.executor.submit(self._run_job, job_id, task_func, *args, **kwargs)
        return job_id

    def _run_job(self, job_id: str, task_func: Callable, *args, **kwargs):
        with self._lock:
            if job_id in self._jobs:
                self._jobs[job_id]["status"] = "PROCESSING"
                self._jobs[job_id]["started_at"] = datetime.utcnow().isoformat()
                self._jobs[job_id]["progress_pct"] = 10.0

        try:
            # Execute worker callable
            def progress_updater(pct: float):
                with self._lock:
                    if job_id in self._jobs:
                        self._jobs[job_id]["progress_pct"] = min(99.0, pct)

            result = task_func(*args, progress_callback=progress_updater, **kwargs)

            with self._lock:
                if job_id in self._jobs:
                    self._jobs[job_id]["status"] = "COMPLETED"
                    self._jobs[job_id]["progress_pct"] = 100.0
                    self._jobs[job_id]["result"] = result
                    self._jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()
                    self.completed_count += 1
        except Exception as e:
            with self._lock:
                if job_id in self._jobs:
                    self._jobs[job_id]["status"] = "FAILED"
                    self._jobs[job_id]["error"] = str(e)
                    self._jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()
                    self.failed_count += 1

    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            return self._jobs.get(job_id)

    def list_jobs(self, company_id: Optional[str] = None, limit: int = 20) -> list:
        with self._lock:
            jobs = list(self._jobs.values())
            if company_id:
                jobs = [j for j in jobs if j.get("company_id") == company_id]
            jobs.sort(key=lambda x: x["created_at"], reverse=True)
            return jobs[:limit]

    def get_queue_telemetry(self) -> Dict[str, Any]:
        with self._lock:
            active_jobs = [j for j in self._jobs.values() if j["status"] in ["QUEUED", "PROCESSING"]]
            return {
                "active_queue_depth": len(active_jobs),
                "total_completed": self.completed_count,
                "total_failed": self.failed_count,
                "total_submitted": len(self._jobs),
                "active_workers": settings.WORKER_CONCURRENCY,
                "cluster_node_id": settings.CLUSTER_NODE_ID
            }

# Singleton worker queue
task_queue = DistributedTaskManager(max_workers=settings.WORKER_CONCURRENCY)

