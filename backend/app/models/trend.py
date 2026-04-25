from pydantic import BaseModel, Field
from typing import List, Optional


class TrendModel(BaseModel):
    city: str = Field(..., description="城市名称")
    keyword: str = Field(..., description="热点关键词")
    score: float = Field(..., ge=0, description="热度评分")
