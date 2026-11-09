import json
import time
import logging
from typing import Any, Optional, Dict
from threading import Lock
from app.core.config import settings

logger = logging.getLogger("distributed_cache")

class InMemoryTTLCache:
    """Thread-safe in-memory cache with TTL eviction for single-node / dev environments"""
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

    def count(self) -> int:
        with self._lock:
            # Clean expired on query
            now = time.time()
            self._store = {k: v for k, v in self._store.items() if v["expires_at"] > now}
            return len(self._store)

class DistributedCacheManager:
    """
    Tier 2 Distributed Cache Manager.
    Plugs transparently into a Redis cluster in staging/production,
    with an in-memory TTL cache fallback for development.
    """
    def __init__(self):
        self.redis_client = None
        self.local_cache = InMemoryTTLCache()
        self.backend_type = "IN_MEMORY"
        self._init_redis()

    def _init_redis(self):
        if settings.REDIS_URL and settings.ENABLE_DISTRIBUTED_CACHE:
            try:
                import redis
                client = redis.Redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=0.5,
                    socket_timeout=0.5
                )
                client.ping()
                self.redis_client = client
                self.backend_type = "REDIS_CLUSTER"
                logger.info("Connected to Distributed Redis Cache Cluster.")
            except Exception as e:
                self.redis_client = None
                self.backend_type = "IN_MEMORY_FALLBACK"
                logger.warning(f"Redis unavailable ({e}). Using thread-safe in-memory cache.")

    def get(self, key: str) -> Optional[Any]:
        if self.redis_client:
            try:
                val = self.redis_client.get(key)
                if val:
                    self.local_cache.hits += 1
                    return json.loads(val)
                self.local_cache.misses += 1
                return None
            except Exception:
                pass
        return self.local_cache.get(key)

    def set(self, key: str, value: Any, ttl_seconds: int = 300):
        if self.redis_client:
            try:
                self.redis_client.setex(key, ttl_seconds, json.dumps(value))
                return
            except Exception:
                pass
        self.local_cache.set(key, value, ttl_seconds)

    def delete(self, key: str):
        if self.redis_client:
            try:
                self.redis_client.delete(key)
            except Exception:
                pass
        self.local_cache.delete(key)

    def delete_prefix(self, prefix: str):
        if self.redis_client:
            try:
                keys = self.redis_client.keys(f"{prefix}*")
                if keys:
                    self.redis_client.delete(*keys)
            except Exception:
                pass
        self.local_cache.delete_prefix(prefix)

    def get_stats(self) -> Dict[str, Any]:
        total_requests = self.local_cache.hits + self.local_cache.misses
        hit_ratio = round((self.local_cache.hits / total_requests) * 100, 2) if total_requests > 0 else 0.0
        return {
            "backend": self.backend_type,
            "connected_to_cluster": self.redis_client is not None,
            "cached_keys_count": self.local_cache.count(),
            "cache_hits": self.local_cache.hits,
            "cache_misses": self.local_cache.misses,
            "hit_ratio_pct": hit_ratio,
            "cluster_node_id": settings.CLUSTER_NODE_ID
        }

# Singleton instance
distributed_cache = DistributedCacheManager()

