import logging
from contextvars import ContextVar
from typing import Optional
from contextlib import contextmanager

logger = logging.getLogger(__name__)

_current_tenant_id: ContextVar[Optional[int]] = ContextVar("current_tenant_id", default=None)
_current_user_id: ContextVar[Optional[int]] = ContextVar("current_user_id", default=None)


class TenantContext:
    
    @staticmethod
    def get_tenant_id() -> Optional[int]:
        tenant_id = _current_tenant_id.get()
        logger.debug(f"[租户上下文] 获取当前租户ID: {tenant_id}")
        return tenant_id
    
    @staticmethod
    def set_tenant_id(tenant_id: Optional[int]) -> None:
        logger.info(f"[租户上下文] 设置当前租户ID: {tenant_id}")
        _current_tenant_id.set(tenant_id)
    
    @staticmethod
    def get_user_id() -> Optional[int]:
        user_id = _current_user_id.get()
        logger.debug(f"[租户上下文] 获取当前用户ID: {user_id}")
        return user_id
    
    @staticmethod
    def set_user_id(user_id: Optional[int]) -> None:
        logger.info(f"[租户上下文] 设置当前用户ID: {user_id}")
        _current_user_id.set(user_id)
    
    @staticmethod
    def clear() -> None:
        logger.info("[租户上下文] 清除当前上下文")
        _current_tenant_id.set(None)
        _current_user_id.set(None)
    
    @staticmethod
    @contextmanager
    def with_tenant(tenant_id: int, user_id: Optional[int] = None):
        logger.info(f"[租户上下文] 进入租户上下文: tenant_id={tenant_id}, user_id={user_id}")
        tenant_token = _current_tenant_id.set(tenant_id)
        user_token = _current_user_id.set(user_id)
        try:
            yield
        finally:
            logger.info(f"[租户上下文] 退出租户上下文: tenant_id={tenant_id}")
            _current_tenant_id.reset(tenant_token)
            _current_user_id.reset(user_token)


tenant_context = TenantContext()
