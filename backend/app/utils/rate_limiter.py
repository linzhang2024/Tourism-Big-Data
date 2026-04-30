import logging
import time
import threading
from typing import Dict, Optional, Callable, Any
from functools import wraps
from dataclasses import dataclass, field
from fastapi import Request, HTTPException

logger = logging.getLogger(__name__)


@dataclass
class RateLimitConfig:
    max_requests: int = 10
    window_seconds: int = 60
    enabled: bool = True


@dataclass
class RateLimitTracker:
    requests: list = field(default_factory=list)
    lock: threading.Lock = field(default_factory=threading.Lock)


class RateLimiter:
    _instance: Optional['RateLimiter'] = None
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
        self._trackers: Dict[str, RateLimitTracker] = {}
        self._global_lock: threading.Lock = threading.Lock()
        self._configs: Dict[str, RateLimitConfig] = {}
        self._default_config = RateLimitConfig()
        self._initialized = True
        logger.info("[频率限制器] 已初始化")
    
    def _get_tracker(self, key: str) -> RateLimitTracker:
        with self._global_lock:
            if key not in self._trackers:
                self._trackers[key] = RateLimitTracker()
            return self._trackers[key]
    
    def _get_config(self, endpoint: str) -> RateLimitConfig:
        return self._configs.get(endpoint, self._default_config)
    
    def check_rate_limit(self, key: str, endpoint: str = "default") -> bool:
        config = self._get_config(endpoint)
        
        if not config.enabled:
            return True
        
        tracker = self._get_tracker(key)
        now = time.time()
        window_start = now - config.window_seconds
        
        with tracker.lock:
            tracker.requests = [req_time for req_time in tracker.requests if req_time > window_start]
            
            if len(tracker.requests) >= config.max_requests:
                logger.warning(f"[频率限制器] 超过限制: key={key}, endpoint={endpoint}, requests={len(tracker.requests)}, max={config.max_requests}")
                return False
            
            tracker.requests.append(now)
            logger.debug(f"[频率限制器] 请求允许: key={key}, endpoint={endpoint}, requests={len(tracker.requests)}/{config.max_requests}")
            return True
    
    def get_remaining_requests(self, key: str, endpoint: str = "default") -> int:
        config = self._get_config(endpoint)
        tracker = self._get_tracker(key)
        now = time.time()
        window_start = now - config.window_seconds
        
        with tracker.lock:
            current_requests = sum(1 for req_time in tracker.requests if req_time > window_start)
            return max(0, config.max_requests - current_requests)
    
    def set_endpoint_config(self, endpoint: str, max_requests: int, window_seconds: int):
        self._configs[endpoint] = RateLimitConfig(
            max_requests=max_requests,
            window_seconds=window_seconds
        )
        logger.info(f"[频率限制器] 已设置端点 '{endpoint}' 配置: max={max_requests}, window={window_seconds}s")
    
    def clear_tracker(self, key: str):
        with self._global_lock:
            if key in self._trackers:
                del self._trackers[key]
                logger.debug(f"[频率限制器] 已清除追踪器: key={key}")
    
    def get_stats(self) -> Dict[str, Any]:
        with self._global_lock:
            return {
                "active_trackers": len(self._trackers),
                "endpoints_configured": list(self._configs.keys()),
                "default_config": {
                    "max_requests": self._default_config.max_requests,
                    "window_seconds": self._default_config.window_seconds
                }
            }


rate_limiter = RateLimiter()


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    return request.client.host if request.client else "unknown"


def get_user_identifier(request: Request) -> str:
    from app.utils.jwt_utils import get_user_id_from_request
    user_id = get_user_id_from_request(request)
    if user_id:
        return f"user:{user_id}"
    return f"ip:{get_client_ip(request)}"


def rate_limit(max_requests: int = 10, window_seconds: int = 60, endpoint: str = "default"):
    def decorator(func: Callable) -> Callable:
        rate_limiter.set_endpoint_config(endpoint, max_requests, window_seconds)
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            request = kwargs.get("request")
            if request is None:
                for arg in args:
                    if isinstance(arg, Request):
                        request = arg
                        break
            
            if request is None:
                logger.warning("[频率限制装饰器] 无法获取Request对象，跳过频率限制检查")
                return await func(*args, **kwargs) if hasattr(func, "__await__") else func(*args, **kwargs)
            
            key = get_user_identifier(request)
            
            if not rate_limiter.check_rate_limit(key, endpoint):
                remaining = rate_limiter.get_remaining_requests(key, endpoint)
                config = rate_limiter._get_config(endpoint)
                logger.warning(f"[频率限制] 请求被拒绝: key={key}, endpoint={endpoint}")
                raise HTTPException(
                    status_code=429,
                    detail={
                        "message": "请求频率过高，请稍后重试",
                        "max_requests": config.max_requests,
                        "window_seconds": config.window_seconds,
                        "retry_after": window_seconds
                    }
                )
            
            if hasattr(func, "__await__") or asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            return func(*args, **kwargs)
        
        import asyncio
        return wrapper
    
    return decorator


def setup_rate_limits():
    rate_limiter.set_endpoint_config("itinerary:generate", max_requests=5, window_seconds=60)
    rate_limiter.set_endpoint_config("itinerary:list", max_requests=100, window_seconds=60)
    rate_limiter.set_endpoint_config("itinerary:create", max_requests=10, window_seconds=60)
    logger.info("[频率限制器] 已配置默认端点限制")
