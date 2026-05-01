from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class TenantBase(BaseModel):
    name: str = Field(..., description="租户名称，如：公司A")
    code: str = Field(..., description="租户唯一代码标识，如：TENANT_A")
    description: Optional[str] = Field(None, description="租户详细描述")


class TenantCreate(TenantBase):
    pass


class TenantResponse(TenantBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="租户唯一 ID")
    created_at: datetime = Field(..., description="创建时间")
    is_active: bool = Field(default=True, description="是否激活")
