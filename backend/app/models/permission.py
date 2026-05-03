from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum


class PermissionType(str, Enum):
    MENU = "menu"
    DATA = "data"


class PermissionCategory(str, Enum):
    SYSTEM_MANAGEMENT = "系统管理"
    ITINERARY_BUSINESS = "行程业务"
    MENU_VISIBILITY = "菜单可见性"
    DATA_OPERATIONS = "数据操作"
    SPIDER_MANAGEMENT = "爬虫管理"


class PermissionCode(str, Enum):
    DATA_VIEW = "data:view"
    DATA_EXPORT = "data:export"
    SPIDER_RUN = "spider:run"
    SYS_MANAGE = "sys:manage"
    ITINERARY_VIEW = "itinerary:view"
    ITINERARY_CREATE = "itinerary:create"
    ITINERARY_UPDATE = "itinerary:update"
    ITINERARY_DELETE = "itinerary:delete"
    MENU_TENANTS = "menu:tenants"
    MENU_ROLES = "menu:roles"
    MENU_PERMISSIONS = "menu:permissions"
    MENU_DASHBOARD = "menu:dashboard"
    MENU_INSIGHTS = "menu:insights"
    MENU_ITINERARY = "menu:itinerary"
    MENU_PROFILE = "menu:profile"
    MENU_AUDIT_LOGS = "menu:audit-logs"


PERMISSION_CATEGORY_MAP = {
    PermissionCode.DATA_VIEW: PermissionCategory.DATA_OPERATIONS,
    PermissionCode.DATA_EXPORT: PermissionCategory.DATA_OPERATIONS,
    PermissionCode.SPIDER_RUN: PermissionCategory.SPIDER_MANAGEMENT,
    PermissionCode.SYS_MANAGE: PermissionCategory.SYSTEM_MANAGEMENT,
    PermissionCode.ITINERARY_VIEW: PermissionCategory.ITINERARY_BUSINESS,
    PermissionCode.ITINERARY_CREATE: PermissionCategory.ITINERARY_BUSINESS,
    PermissionCode.ITINERARY_UPDATE: PermissionCategory.ITINERARY_BUSINESS,
    PermissionCode.ITINERARY_DELETE: PermissionCategory.ITINERARY_BUSINESS,
    PermissionCode.MENU_TENANTS: PermissionCategory.MENU_VISIBILITY,
    PermissionCode.MENU_ROLES: PermissionCategory.MENU_VISIBILITY,
    PermissionCode.MENU_PERMISSIONS: PermissionCategory.MENU_VISIBILITY,
    PermissionCode.MENU_DASHBOARD: PermissionCategory.MENU_VISIBILITY,
    PermissionCode.MENU_INSIGHTS: PermissionCategory.MENU_VISIBILITY,
    PermissionCode.MENU_ITINERARY: PermissionCategory.MENU_VISIBILITY,
    PermissionCode.MENU_PROFILE: PermissionCategory.MENU_VISIBILITY,
    PermissionCode.MENU_AUDIT_LOGS: PermissionCategory.MENU_VISIBILITY,
}


def get_permission_category(permission_code: str) -> PermissionCategory:
    return PERMISSION_CATEGORY_MAP.get(permission_code, PermissionCategory.DATA_OPERATIONS)


class PermissionBase(BaseModel):
    name: str = Field(..., description="权限名称，如：导出数据")
    code: str = Field(..., description="权限代码，如：data:export")
    permission_type: str = Field(default=PermissionType.DATA, description="权限类型：menu(菜单权限)、data(数据权限)")
    category: str = Field(default=PermissionCategory.DATA_OPERATIONS, description="权限分类：系统管理、行程业务、菜单可见性、数据操作、爬虫管理")
    description: Optional[str] = Field(None, description="权限详细描述")


class PermissionCreate(PermissionBase):
    pass


class PermissionResponse(PermissionBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="权限唯一 ID")
    created_at: datetime = Field(..., description="创建时间")