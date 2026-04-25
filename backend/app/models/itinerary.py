from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class InterestPreference(str, Enum):
    CULTURE = "culture"
    NATURE = "nature"
    FOOD = "food"
    SHOPPING = "shopping"
    ADVENTURE = "adventure"
    RELAXATION = "relaxation"


class Activity(BaseModel):
    time: str = Field(..., description="活动时间，如 '09:00-11:00'")
    name: str = Field(..., description="活动名称")
    description: Optional[str] = Field(None, description="活动描述")
    location: Optional[str] = Field(None, description="活动地点")
    estimated_cost: Optional[float] = Field(None, description="预估费用")
    category: Optional[str] = Field(None, description="活动类别")


class DayPlan(BaseModel):
    day: int = Field(..., description="第几天")
    activities: List[Activity] = Field(default_factory=list, description="当日活动列表")
    summary: Optional[str] = Field(None, description="当日行程概述")


class ItineraryRequest(BaseModel):
    departure: str = Field(..., description="出发地")
    destination: str = Field(..., description="目的地")
    days: int = Field(..., ge=1, le=30, description="行程天数")
    budget: Optional[float] = Field(None, ge=0, description="预算金额")
    interests: Optional[List[InterestPreference]] = Field(default_factory=list, description="兴趣偏好列表")
    travel_style: Optional[str] = Field(None, description="旅行风格")


class ItineraryResponse(BaseModel):
    title: str = Field(..., description="行程标题")
    departure: str = Field(..., description="出发地")
    destination: str = Field(..., description="目的地")
    days: int = Field(..., description="行程天数")
    estimated_total_cost: Optional[float] = Field(None, description="预估总费用")
    daily_plans: List[DayPlan] = Field(default_factory=list, description="每日行程计划")
    tips: Optional[List[str]] = Field(default_factory=list, description="旅行提示")
