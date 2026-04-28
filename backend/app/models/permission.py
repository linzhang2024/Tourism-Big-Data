from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from enum import Enum


class PermissionCode(str, Enum):
    DATA_VIEW = "data:view"
    DATA_EXPORT = "data:export"
    SPIDER_RUN = "spider:run"
    SYS_MANAGE = "sys:manage"
    ITINERARY_VIEW = "itinerary:view"
    ITINERARY_CREATE = "itinerary:create"
    ITINERARY_UPDATE = "itinerary:update"
    ITINERARY_DELETE = "itinerary:delete"


class PermissionBase(BaseModel):
    name: str = Field(..., description="权限名称，如：导出数据")
    code: str = Field(..., description="权限代码，如：data:export")
    description: Optional[str] = Field(None, description="权限详细描述")


class PermissionCreate(PermissionBase):
    pass


class PermissionResponse(PermissionBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="权限唯一 ID")
    created_at: datetime = Field(..., description="创建时间")