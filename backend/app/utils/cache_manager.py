import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import threading

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    key: str
    value: Any
    created_at: datetime
    ttl: Optional[int] = None
    
    def is_expired(self) -> bool:
        if self.ttl is None:
            return False
        return datetime.now() > self.created_at + timedelta(seconds=self.ttl)


class CacheManager:
    _instance: Optional['CacheManager'] = None
    _lock: threading.Lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._cache: Dict[str, CacheEntry] = {}
        self._lock: threading.RLock = threading.RLock()
        self._initialized = True
        logger.info("[缓存管理器] 内存缓存已初始化")
    
    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._cache:
                logger.debug(f"[缓存管理器] 缓存未命中: {key}")
                return None
            
            entry = self._cache[key]
            if entry.is_expired():
                logger.debug(f"[缓存管理器] 缓存已过期: {key}")
                del self._cache[key]
                return None
            
            logger.debug(f"[缓存管理器] 缓存命中: {key}")
            return entry.value
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        with self._lock:
            self._cache[key] = CacheEntry(
                key=key,
                value=value,
                created_at=datetime.now(),
                ttl=ttl
            )
            logger.debug(f"[缓存管理器] 缓存已设置: {key}, TTL: {ttl}秒")
    
    def delete(self, key: str) -> bool:
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                logger.debug(f"[缓存管理器] 缓存已删除: {key}")
                return True
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        with self._lock:
            keys_to_delete = [
                key for key in self._cache.keys()
                if pattern in key
            ]
            for key in keys_to_delete:
                del self._cache[key]
            if keys_to_delete:
                logger.debug(f"[缓存管理器] 已删除 {len(keys_to_delete)} 个匹配 '{pattern}' 的缓存项")
            return len(keys_to_delete)
    
    def clear(self) -> None:
        with self._lock:
            self._cache.clear()
            logger.info("[缓存管理器] 所有缓存已清除")
    
    def get_stats(self) -> Dict[str, Any]:
        with self._lock:
            total_count = len(self._cache)
            expired_count = sum(1 for entry in self._cache.values() if entry.is_expired())
            return {
                "total_entries": total_count,
                "expired_entries": expired_count,
                "active_entries": total_count - expired_count
            }
    
    def contains(self, key: str) -> bool:
        with self._lock:
            if key not in self._cache:
                return False
            entry = self._cache[key]
            if entry.is_expired():
                del self._cache[key]
                return False
            return True


cache_manager = CacheManager()
