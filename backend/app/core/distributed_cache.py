import json
import time
import logging
from datetime import datetime, timedelta
from typing import Any, Optional, Dict, List
from threading import Lock
from app.core.config import settings

logger = logging.getLogger("distributed_cache")


class InMemoryTTLCache:
    """Thread-safe L1 in-memory cache with TTL eviction."""
    def __init__(self):
        self._store: Dict[str, Dict[str, Any]] = {}
        self._lock = Lock()
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            entry = self._store.get(key)
            if not entry:
                self.misses += 1
                return None
            if time.time() > entry["expires_at"]:
                del self._store[key]
                self.misses += 1
                return None
            self.hits += 1
            return entry["val"]

    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        with self._lock:
            self._store[key] = {
                "val": value,
                "expires_at": time.time() + ttl_seconds
            }

    def delete(self, key: str):
        with self._lock:
            if key in self._store:
                del self._store[key]

    def delete_prefix(self, prefix: str):
        with self._lock:
            keys_to_delete = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_delete:
                del self._store[k]

    def get_by_prefix(self, prefix: str) -> List[Dict[str, Any]]:
        now = time.time()
        with self._lock:
            results = []
            expired = []
            for k, entry in self._store.items():
                if entry["expires_at"] <= now:
                    expired.append(k)
                elif k.startswith(prefix):
                    results.append({"key": k, "value": entry["val"]})
            for k in expired:
                del self._store[k]
            return results

    def count(self) -> int:
        with self._lock:
            now = time.time()
            self._store = {k: v for k, v in self._store.items() if v["expires_at"] > now}
            return len(self._store)


class DistributedCacheManager:
    """
    Tier 2 Distributed Cache & Shared State Manager.
    Priority order:
      1. Redis cluster (`REDIS_CLUSTER`) when Redis is reachable.
      2. PostgreSQL shared L2 store (`POSTGRES_DISTRIBUTED`) + L1 memory cache when running on PostgreSQL without Redis,
         ensuring rate limits, lockouts, revoked JWT JTIs, and node heartbeats remain consistent across all load-balanced nodes.
      3. In-memory TTL fallback (`IN_MEMORY_FALLBACK`).
    """
    def __init__(self):
        self.redis_client = None
        self.local_cache = InMemoryTTLCache()
        self.backend_type = "IN_MEMORY_FALLBACK"
        self._init_backend()

    def _init_backend(self):
        if settings.REDIS_URL and settings.ENABLE_DISTRIBUTED_CACHE:
            try:
                import redis
                client = redis.Redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=0.4,
                    socket_timeout=0.4,
                )
                client.ping()
                self.redis_client = client
                self.backend_type = "REDIS_CLUSTER"
                logger.info("Connected to Distributed Redis Cache Cluster.")
                return
            except Exception as e:
                self.redis_client = None
                logger.info(f"Redis unavailable ({e}); checking PostgreSQL shared L2 state.")

        if "postgresql" in settings.DATABASE_URL and settings.ENABLE_DISTRIBUTED_CACHE:
            self.backend_type = "POSTGRES_DISTRIBUTED"
        else:
            self.backend_type = "IN_MEMORY_FALLBACK"

    def _pg_session(self):
        from app.db.session import SessionLocal
        return SessionLocal()

    def _pg_model(self):
        from app.models.models import ClusterKVStore
        return ClusterKVStore

    def get(self, key: str) -> Optional[Any]:
        if self.redis_client:
            try:
                val = self.redis_client.get(key)
                if val is not None:
                    self.local_cache.hits += 1
                    return json.loads(val)
                self.local_cache.misses += 1
                return None
            except Exception:
                pass

        # Fast L1 lookup for high-frequency read keys
        l1 = self.local_cache.get(key)
        if l1 is not None:
            return l1

        if self.backend_type == "POSTGRES_DISTRIBUTED":
            try:
                ClusterKVStore = self._pg_model()
                db = self._pg_session()
                try:
                    now = datetime.utcnow()
                    row = db.query(ClusterKVStore).filter(ClusterKVStore.key == key).first()
                    if row and (row.expires_at is None or row.expires_at > now):
                        val = json.loads(row.value_text)
                        ttl_rem = int((row.expires_at - now).total_seconds()) if row.expires_at else 300
                        if ttl_rem > 0:
                            # Short L1 cache (max 5s for volatile counters/sessions, longer for tenant standing)
                            self.local_cache.set(key, val, ttl_seconds=min(ttl_rem, 15))
                        self.local_cache.hits += 1
                        return val
                    elif row and row.expires_at and row.expires_at <= now:
                        db.delete(row)
                        db.commit()
                finally:
                    db.close()
            except Exception:
                pass

        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        if self.redis_client:
            try:
                self.redis_client.setex(key, ttl_seconds, json.dumps(value))
                return
            except Exception:
                pass

        self.local_cache.set(key, value, ttl_seconds)

        if self.backend_type == "POSTGRES_DISTRIBUTED":
            try:
                ClusterKVStore = self._pg_model()
                db = self._pg_session()
                try:
                    now = datetime.utcnow()
                    exp = now + timedelta(seconds=ttl_seconds)
                    payload = json.dumps(value)
                    row = db.query(ClusterKVStore).filter(ClusterKVStore.key == key).first()
                    if row:
                        row.value_text = payload
                        row.expires_at = exp
                        row.updated_at = now
                    else:
                        db.add(ClusterKVStore(
                            key=key,
                            value_text=payload,
                            counter_val=int(value) if isinstance(value, int) else 0,
                            expires_at=exp,
                            updated_at=now,
                        ))
                    db.commit()
                finally:
                    db.close()
            except Exception:
                pass

    def delete(self, key: str):
        if self.redis_client:
            try:
                self.redis_client.delete(key)
            except Exception:
                pass
        self.local_cache.delete(key)
        if self.backend_type == "POSTGRES_DISTRIBUTED":
            try:
                ClusterKVStore = self._pg_model()
                db = self._pg_session()
                try:
                    db.query(ClusterKVStore).filter(ClusterKVStore.key == key).delete()
                    db.commit()
                finally:
                    db.close()
            except Exception:
                pass

    def delete_prefix(self, prefix: str):
        if self.redis_client:
            try:
                keys = self.redis_client.keys(f"{prefix}*")
                if keys:
                    self.redis_client.delete(*keys)
            except Exception:
                pass
        self.local_cache.delete_prefix(prefix)
        if self.backend_type == "POSTGRES_DISTRIBUTED":
            try:
                ClusterKVStore = self._pg_model()
                db = self._pg_session()
                try:
                    db.query(ClusterKVStore).filter(ClusterKVStore.key.like(f"{prefix}%")).delete(
                        synchronize_session=False
                    )
                    db.commit()
                finally:
                    db.close()
            except Exception:
                pass

    def get_by_prefix(self, prefix: str) -> List[Dict[str, Any]]:
        if self.redis_client:
            try:
                keys = self.redis_client.keys(f"{prefix}*")
                out = []
                for k in keys:
                    raw = self.redis_client.get(k)
                    if raw:
                        out.append({"key": k, "value": json.loads(raw)})
                return out
            except Exception:
                pass

        if self.backend_type == "POSTGRES_DISTRIBUTED":
            try:
                ClusterKVStore = self._pg_model()
                db = self._pg_session()
                try:
                    now = datetime.utcnow()
                    rows = db.query(ClusterKVStore).filter(
                        ClusterKVStore.key.like(f"{prefix}%"),
                        (ClusterKVStore.expires_at.is_(None)) | (ClusterKVStore.expires_at > now),
                    ).all()
                    return [{"key": r.key, "value": json.loads(r.value_text)} for r in rows]
                finally:
                    db.close()
            except Exception:
                pass

        return self.local_cache.get_by_prefix(prefix)

    def incr_window(self, key: str, window_seconds: int = 60) -> int:
        if self.redis_client:
            try:
                pipe = self.redis_client.pipeline()
                pipe.incr(key)
                pipe.expire(key, window_seconds)
                res = pipe.execute()
                return int(res[0])
            except Exception:
                pass

        if self.backend_type == "POSTGRES_DISTRIBUTED":
            try:
                from sqlalchemy import text
                db = self._pg_session()
                try:
                    now = datetime.utcnow()
                    exp = now + timedelta(seconds=window_seconds)
                    stmt = text("""
                        INSERT INTO cluster_kv_store (key, value_text, counter_val, expires_at, updated_at)
                        VALUES (:k, '1', 1, :exp, :now)
                        ON CONFLICT (key) DO UPDATE SET
                            counter_val = CASE
                                WHEN cluster_kv_store.expires_at IS NULL OR cluster_kv_store.expires_at > :now
                                THEN cluster_kv_store.counter_val + 1
                                ELSE 1
                            END,
                            value_text = CASE
                                WHEN cluster_kv_store.expires_at IS NULL OR cluster_kv_store.expires_at > :now
                                THEN CAST(cluster_kv_store.counter_val + 1 AS TEXT)
                                ELSE '1'
                            END,
                            expires_at = CASE
                                WHEN cluster_kv_store.expires_at IS NULL OR cluster_kv_store.expires_at > :now
                                THEN cluster_kv_store.expires_at
                                ELSE :exp
                            END,
                            updated_at = :now
                        RETURNING counter_val
                    """)
                    val = db.execute(stmt, {"k": key, "exp": exp, "now": now}).scalar_one()
                    db.commit()
                    return int(val)
                finally:
                    db.close()
            except Exception:
                pass

        with self.local_cache._lock:
            now = time.time()
            entry = self.local_cache._store.get(key)
            if not entry or now > entry["expires_at"]:
                self.local_cache._store[key] = {"val": 1, "expires_at": now + window_seconds}
                return 1
            entry["val"] = int(entry["val"]) + 1
            return entry["val"]

    def get_stats(self) -> Dict[str, Any]:
        total_requests = self.local_cache.hits + self.local_cache.misses
        hit_ratio = round((self.local_cache.hits / total_requests) * 100, 2) if total_requests > 0 else 0.0
        pg_keys = self.local_cache.count()
        if self.backend_type == "POSTGRES_DISTRIBUTED":
            try:
                ClusterKVStore = self._pg_model()
                db = self._pg_session()
                try:
                    now = datetime.utcnow()
                    pg_keys = db.query(ClusterKVStore).filter(
                        (ClusterKVStore.expires_at.is_(None)) | (ClusterKVStore.expires_at > now)
                    ).count()
                finally:
                    db.close()
            except Exception:
                pass

        return {
            "backend": self.backend_type,
            "connected_to_cluster": self.redis_client is not None or self.backend_type == "POSTGRES_DISTRIBUTED",
            "cached_keys_count": pg_keys,
            "cache_hits": self.local_cache.hits,
            "cache_misses": self.local_cache.misses,
            "hit_ratio_pct": hit_ratio,
            "cluster_node_id": settings.CLUSTER_NODE_ID
        }


# Singleton instance
distributed_cache = DistributedCacheManager()
