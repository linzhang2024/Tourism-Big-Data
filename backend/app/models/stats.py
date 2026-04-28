from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class BasicStats(BaseModel):
    total_users: int = Field(..., description="总用户数")
    total_itineraries: int = Field(..., description="总行程数")
    total_cities: int = Field(..., description="总城市数")


class DetailedStats(BasicStats):
    active_users_last_7_days: int = Field(..., description="过去7天活跃用户数")
    avg_itineraries_per_user: float = Field(..., description="平均每用户行程数")
    top_destinations: List[str] = Field(..., description="热门目的地列表")


class AdminStats(DetailedStats):
    total_permissions: int = Field(..., description="总权限数")
    total_roles: int = Field(..., description="总角色数")
    recent_logins: List[dict] = Field(..., description="最近登录记录")


class StatsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    access_level: str = Field(..., description="访问级别: basic, detailed, admin")
    data_retrieved_at: datetime = Field(..., description="数据获取时间")
    stats: dict = Field(..., description="统计数据")
    user_role: str = Field(..., description="用户角色")
    user_permissions: List[str] = Field(..., description="用户拥有的权限列表")
