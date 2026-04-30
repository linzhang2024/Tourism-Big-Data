from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class CityHotspot(BaseModel):
    name: str = Field(..., description="城市名称")
    count: int = Field(..., description="行程数量")
    avg_budget: float = Field(..., description="平均预算")
    total_spending: float = Field(..., description="总消费金额")


class MonthlyTrend(BaseModel):
    month: str = Field(..., description="月份，格式：YYYY-MM")
    total_itineraries: int = Field(..., description="当月行程总数")
    total_spending: float = Field(..., description="当月总消费金额")
    avg_budget: float = Field(..., description="当月平均预算")


class AnalysisRequest(BaseModel):
    start_date: Optional[str] = Field(None, description="开始日期，格式：YYYY-MM")
    end_date: Optional[str] = Field(None, description="结束日期，格式：YYYY-MM")
    destination_categories: Optional[List[str]] = Field(None, description="目的地类别筛选")


class AnalysisResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    generated_at: datetime = Field(..., description="数据生成时间")
    period: Dict[str, Optional[str]] = Field(..., description="统计周期")
    city_hotspots: List[CityHotspot] = Field(..., description="城市热度分布")
    monthly_trends: List[MonthlyTrend] = Field(..., description="月度消费趋势")
    summary: Dict[str, Any] = Field(..., description="汇总统计")


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
