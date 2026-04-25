from fastapi import APIRouter, Query
from typing import List, Optional
from app.models.trend import TrendModel
from app.services.spider_service import fetch_city_trends

router = APIRouter()

DEFAULT_CITIES = ["北京", "上海", "广州", "深圳", "杭州", "成都", "西安", "三亚"]


@router.get("/", response_model=List[TrendModel])
async def get_trends(
    cities: Optional[List[str]] = Query(
        None,
        description="城市名称列表，不传则使用默认城市列表"
    )
):
    """
    获取多个城市的旅游热点趋势数据
    
    Args:
        cities: 城市名称列表，可选参数
        
    Returns:
        所有城市的热点关键词列表
    """
    target_cities = cities if cities else DEFAULT_CITIES
    
    all_trends: List[TrendModel] = []
    
    for city in target_cities:
        city_trends = await fetch_city_trends(city)
        all_trends.extend(city_trends)
    
    return all_trends
