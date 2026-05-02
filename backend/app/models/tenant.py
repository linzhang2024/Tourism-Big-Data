from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class TenantBase(BaseModel):
    name: str = Field(..., description="租户名称，如：公司A")
    code: str = Field(..., description="租户唯一代码标识，如：TENANT_A")
    description: Optional[str] = Field(None, description="租户详细描述")
    logo_url: Optional[str] = Field(None, description="租户Logo URL")
    itinerary_limit: Optional[int] = Field(100, description="行程数量上限")
    ai_calls_limit: Optional[int] = Field(50, description="AI调用次数上限")
    allowed_role_codes: List[str] = Field(default_factory=list, description="该租户允许使用的角色代码列表")


class TenantCreate(TenantBase):
    pass


class TenantUpdate(BaseModel):
    name: Optional[str] = Field(None, description="租户名称")
    description: Optional[str] = Field(None, description="租户详细描述")
    logo_url: Optional[str] = Field(None, description="租户Logo URL")
    is_active: Optional[bool] = Field(None, description="是否激活")
    itinerary_limit: Optional[int] = Field(None, description="行程数量上限")
    ai_calls_limit: Optional[int] = Field(None, description="AI调用次数上限")
    allowed_role_codes: Optional[List[str]] = Field(None, description="该租户允许使用的角色代码列表")


class QuotaUsage(BaseModel):
    itinerary_used: int = Field(0, description="已使用的行程数量")
    ai_calls_used: int = Field(0, description="已使用的AI调用次数")
    itinerary_limit: int = Field(100, description="行程数量上限")
    ai_calls_limit: int = Field(50, description="AI调用次数上限")
    itinerary_remaining: int = Field(100, description="剩余行程数量")
    ai_calls_remaining: int = Field(50, description="剩余AI调用次数")


class TenantResponse(TenantBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="租户唯一 ID")
    created_at: datetime = Field(..., description="创建时间")
    is_active: bool = Field(default=True, description="是否激活")
    itinerary_used: int = Field(0, description="已使用的行程数量")
    ai_calls_used: int = Field(0, description="已使用的AI调用次数")


class TenantWithQuota(TenantResponse):
    itinerary_remaining: int = Field(100, description="剩余行程数量")
    ai_calls_remaining: int = Field(50, description="剩余AI调用次数")
    itinerary_percentage: float = Field(0.0, description="行程使用百分比")
    ai_calls_percentage: float = Field(0.0, description="AI调用使用百分比")
