import pytest
from unittest.mock import AsyncMock, patch
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.models.trend import TrendModel
from app.services import spider_service


MOCK_RAW_DATA = {
    "city": "北京",
    "timestamp": "2026-04-25T00:00:00Z",
    "data_source": "tourism_search_api",
    "hotspots": [
        {
            "term": "故宫",
            "search_volume": 8500,
            "mention_count": 4200,
            "trend_direction": "up",
        },
        {
            "term": "长城",
            "search_volume": 7200,
            "mention_count": 3800,
            "trend_direction": "stable",
        },
        {
            "term": "烤鸭",
            "search_volume": 5600,
            "mention_count": 2900,
            "trend_direction": "up",
        },
    ]
}

MOCK_EMPTY_DATA = {
    "city": "未知城市",
    "timestamp": "2026-04-25T00:00:00Z",
    "data_source": "tourism_search_api",
    "hotspots": []
}

MOCK_INVALID_DATA = {}


class TestSpiderService:
    
    @pytest.mark.asyncio
    async def test_fetch_city_trends_normal_data(self, mocker):
        """测试正常数据抓取和清洗"""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = MOCK_RAW_DATA
        
        with patch("httpx.AsyncClient.get", return_value=mock_response):
            trends = await spider_service.fetch_city_trends("北京")
        
        assert len(trends) == 3
        
        keywords = [t.keyword for t in trends]
        assert "故宫" in keywords
        assert "长城" in keywords
        assert "烤鸭" in keywords
        
        for trend in trends:
            assert trend.city == "北京"
            assert isinstance(trend.keyword, str)
            assert isinstance(trend.score, float)
            assert trend.score >= 0
        
        scores = [t.score for t in trends]
        assert scores == sorted(scores, reverse=True)
    
    @pytest.mark.asyncio
    async def test_fetch_city_trends_empty_hotspots(self, mocker):
        """测试空热词数据的情况"""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = MOCK_EMPTY_DATA
        
        with patch("httpx.AsyncClient.get", return_value=mock_response):
            trends = await spider_service.fetch_city_trends("未知城市")
        
        assert len(trends) == 0
        assert isinstance(trends, list)
    
    @pytest.mark.asyncio
    async def test_fetch_city_trends_invalid_data(self, mocker):
        """测试无效数据的情况"""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = MOCK_INVALID_DATA
        
        with patch("httpx.AsyncClient.get", return_value=mock_response):
            trends = await spider_service.fetch_city_trends("测试城市")
        
        assert len(trends) == 0
        assert isinstance(trends, list)
    
    @pytest.mark.asyncio
    async def test_fetch_city_trends_network_error(self, mocker):
        """测试网络请求失败的情况（使用模拟数据）"""
        from httpx import HTTPError
        
        with patch("httpx.AsyncClient.get", side_effect=HTTPError("网络连接失败")):
            trends = await spider_service.fetch_city_trends("上海")
        
        assert isinstance(trends, list)
        for trend in trends:
            assert isinstance(trend, TrendModel)
            assert trend.city == "上海"
            assert isinstance(trend.keyword, str)
            assert isinstance(trend.score, float)
            assert trend.score >= 0
    
    def test_clean_data_normal_case(self):
        """测试数据清洗函数 - 正常情况"""
        trends = spider_service._clean_data("北京", MOCK_RAW_DATA)
        
        assert len(trends) == 3
        
        for trend in trends:
            assert trend.city == "北京"
            assert isinstance(trend.score, float)
            assert trend.score >= 0
            assert trend.score <= 100
        
        scores = [t.score for t in trends]
        assert scores == sorted(scores, reverse=True)
    
    def test_clean_data_empty_hotspots(self):
        """测试数据清洗函数 - 空热词"""
        trends = spider_service._clean_data("北京", MOCK_EMPTY_DATA)
        
        assert len(trends) == 0
        assert isinstance(trends, list)
    
    def test_clean_data_none_input(self):
        """测试数据清洗函数 - None 输入"""
        trends = spider_service._clean_data("北京", None)
        
        assert len(trends) == 0
        assert isinstance(trends, list)
    
    def test_clean_data_empty_dict(self):
        """测试数据清洗函数 - 空字典"""
        trends = spider_service._clean_data("北京", {})
        
        assert len(trends) == 0
        assert isinstance(trends, list)
    
    def test_calculate_score(self):
        """测试评分计算函数"""
        score1 = spider_service._calculate_score(10000, 5000, 10000)
        assert score1 == 100.0
        
        score2 = spider_service._calculate_score(5000, 2500, 10000)
        assert 49.0 <= score2 <= 51.0
        
        score3 = spider_service._calculate_score(0, 0, 10000)
        assert score3 == 0.0
        
        score4 = spider_service._calculate_score(5000, 2500, 0)
        assert score4 == 0.0
    
    def test_clean_data_filters_empty_keywords(self):
        """测试数据清洗函数过滤空关键词"""
        invalid_data = {
            "city": "测试",
            "hotspots": [
                {"term": "", "search_volume": 1000, "mention_count": 500},
                {"term": "   ", "search_volume": 2000, "mention_count": 1000},
                {"term": "有效关键词", "search_volume": 3000, "mention_count": 1500},
            ]
        }
        
        trends = spider_service._clean_data("测试", invalid_data)
        
        assert len(trends) == 1
        assert trends[0].keyword == "有效关键词"
