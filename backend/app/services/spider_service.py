import httpx
import random
from typing import List, Optional
from app.models.trend import TrendModel


DEFAULT_KEYWORDS = [
    "美食探店", "景点打卡", "自由行攻略", "亲子游", "情侣旅行",
    "摄影圣地", "历史文化", "自然风光", "温泉度假", "主题公园",
    "民宿体验", "户外运动", "美食街", "夜市", "海滨度假",
    "古镇游", "红色旅游", "滑雪胜地", "游乐园", "购物中心"
]


async def fetch_city_trends(city: str) -> List[TrendModel]:
    """
    异步获取指定城市的旅游热点关键词分布
    
    Args:
        city: 城市名称
        
    Returns:
        该城市的热点关键词列表（TrendModel格式）
    """
    raw_data = await _fetch_raw_data(city)
    cleaned_data = _clean_data(city, raw_data)
    return cleaned_data


async def _fetch_raw_data(city: str) -> dict:
    """
    模拟通过 httpx 从数据源获取原始数据
    
    Args:
        city: 城市名称
        
    Returns:
        原始非结构化数据
    """
    url = f"https://api.tourism-data.example/city/{city}/trends"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url)
            if response.status_code == 200:
                return response.json()
        except httpx.HTTPError:
            pass
    
    return _generate_mock_raw_data(city)


def _generate_mock_raw_data(city: str) -> dict:
    """
    生成模拟的原始数据（当网络请求失败时使用）
    
    Args:
        city: 城市名称
        
    Returns:
        模拟的原始数据
    """
    num_keywords = random.randint(3, 8)
    selected_keywords = random.sample(DEFAULT_KEYWORDS, min(num_keywords, len(DEFAULT_KEYWORDS)))
    
    hotspots = []
    for keyword in selected_keywords:
        hotspots.append({
            "term": keyword,
            "search_volume": random.randint(100, 10000),
            "mention_count": random.randint(50, 5000),
            "trend_direction": random.choice(["up", "down", "stable"]),
        })
    
    return {
        "city": city,
        "timestamp": "2026-04-25T00:00:00Z",
        "data_source": "tourism_search_api",
        "hotspots": hotspots
    }


def _clean_data(city: str, raw_data: dict) -> List[TrendModel]:
    """
    将非结构化原始数据清洗转化为 TrendModel 格式
    
    Args:
        city: 城市名称
        raw_data: 原始数据
        
    Returns:
        清洗后的 TrendModel 列表
    """
    trends: List[TrendModel] = []
    
    if not raw_data:
        return trends
    
    hotspots = raw_data.get("hotspots", [])
    if not hotspots:
        return trends
    
    max_search_volume = max(
        (h.get("search_volume", 0) for h in hotspots),
        default=1
    )
    
    for hotspot in hotspots:
        keyword = hotspot.get("term", "").strip()
        if not keyword:
            continue
        
        search_volume = hotspot.get("search_volume", 0)
        mention_count = hotspot.get("mention_count", 0)
        
        normalized_score = _calculate_score(search_volume, mention_count, max_search_volume)
        
        trends.append(TrendModel(
            city=city,
            keyword=keyword,
            score=normalized_score
        ))
    
    trends.sort(key=lambda x: x.score, reverse=True)
    
    return trends


def _calculate_score(search_volume: int, mention_count: int, max_search_volume: int) -> float:
    """
    计算标准化热度评分（0-100）
    
    Args:
        search_volume: 搜索量
        mention_count: 提及次数
        max_search_volume: 最大搜索量（用于归一化）
        
    Returns:
        标准化评分
    """
    if max_search_volume <= 0:
        return 0.0
    
    search_weight = 0.7
    mention_weight = 0.3
    
    normalized_search = (search_volume / max_search_volume) * 100
    
    max_mention_estimate = max_search_volume * 0.5
    normalized_mention = (min(mention_count, max_mention_estimate) / max(max_mention_estimate, 1)) * 100
    
    total_score = (normalized_search * search_weight) + (normalized_mention * mention_weight)
    
    return round(total_score, 2)
