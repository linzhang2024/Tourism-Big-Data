import pytest
import sys
import os
from httpx import AsyncClient
from datetime import datetime
from unittest.mock import patch, MagicMock
from copy import deepcopy

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app
from app.services.itinerary_service import itinerary_service, ai_itinerary_service
from app.services.stats_service import stats_service
from app.models.itinerary import ItineraryCreate, DayPlan, Activity, InterestPreference
from app.utils.cache_manager import cache_manager


class TestAnalysisLogic:
    """测试数据聚合分析逻辑"""
    
    @pytest.fixture(autouse=True)
    def reset_services(self):
        """在每个测试前重置服务状态"""
        print("")
        print("-" * 40)
        print("  [FIXTURE] 重置 itinerary_service 和缓存...")
        print(f"  [FIXTURE] 重置前行程数: {len(itinerary_service.itineraries)}")
        
        itinerary_service.itineraries = []
        itinerary_service.next_id = 1
        cache_manager.clear()
        
        print(f"  [FIXTURE] 重置后行程数: {len(itinerary_service.itineraries)}")
        print("-" * 40)
        
        yield
    
    def create_test_itinerary(
        self,
        destination: str,
        budget: float,
        estimated_total_cost: float,
        days: int = 3,
        user_id: int = 1
    ) -> dict:
        """创建测试行程数据"""
        activity = Activity(
            time="09:00-11:00",
            name="测试活动",
            description="测试活动描述",
            location="测试地点",
            estimated_cost=100.0,
            category="culture"
        )
        
        day_plan = DayPlan(
            day=1,
            activities=[activity],
            summary="测试行程摘要"
        )
        
        return {
            "title": f"测试行程 - {destination}",
            "departure": "北京",
            "destination": destination,
            "days": days,
            "budget": budget,
            "estimated_total_cost": estimated_total_cost,
            "daily_plans": [day_plan],
            "tips": ["测试提示1", "测试提示2"],
            "interests": [InterestPreference.CULTURE],
            "travel_style": "休闲",
            "is_ai_generated": False
        }
    
    @pytest.mark.asyncio
    async def test_insert_test_data_and_verify_aggregation(self):
        """
        步骤一: 向数据库插入多条不同城市、不同预算的行程测试数据
        步骤二: 调用分析接口，验证返回的JSON聚合数据在逻辑上是否与插入的数据总量及分布一致
        """
        
        test_data = [
            {"destination": "上海", "budget": 5000.0, "estimated_total_cost": 4500.0, "count": 3},
            {"destination": "北京", "budget": 8000.0, "estimated_total_cost": 7500.0, "count": 5},
            {"destination": "杭州", "budget": 3000.0, "estimated_total_cost": 2800.0, "count": 2},
            {"destination": "成都", "budget": 4000.0, "estimated_total_cost": 3800.0, "count": 4},
            {"destination": "西安", "budget": 3500.0, "estimated_total_cost": 3300.0, "count": 1},
        ]
        
        expected_totals = {
            "上海": {"count": 3, "budget": 5000.0 * 3, "spending": 4500.0 * 3},
            "北京": {"count": 5, "budget": 8000.0 * 5, "spending": 7500.0 * 5},
            "杭州": {"count": 2, "budget": 3000.0 * 2, "spending": 2800.0 * 2},
            "成都": {"count": 4, "budget": 4000.0 * 4, "spending": 3800.0 * 4},
            "西安": {"count": 1, "budget": 3500.0 * 1, "spending": 3300.0 * 1},
        }
        
        total_itineraries = sum(item["count"] for item in test_data)
        total_spending = sum(item["estimated_total_cost"] * item["count"] for item in test_data)
        total_cities = len(test_data)
        
        print("=" * 60)
        print("步骤一: 向数据库插入测试数据")
        print("=" * 60)
        
        for item in test_data:
            for i in range(item["count"]):
                itinerary_data = self.create_test_itinerary(
                    destination=item["destination"],
                    budget=item["budget"],
                    estimated_total_cost=item["estimated_total_cost"]
                )
                itinerary_create = ItineraryCreate(**itinerary_data)
                itinerary = itinerary_service.create_itinerary(itinerary_create, user_id=1)
                print(f"  插入行程: {itinerary.destination} (预算: {itinerary.budget}, 预估消费: {itinerary.estimated_total_cost})")
        
        print(f"")
        print(f"  共插入 {total_itineraries} 条行程数据")
        print(f"  覆盖 {total_cities} 个城市")
        print(f"  总消费金额: RMB {total_spending:.2f}")
        
        print("")
        print("=" * 60)
        print("步骤二: 调用分析接口并验证聚合数据")
        print("=" * 60)
        
        analysis_data = stats_service.get_analysis_data()
        
        print("")
        print("  接口返回数据:")
        print(f"    生成时间: {analysis_data.generated_at}")
        print(f"    总行程数: {analysis_data.summary['total_itineraries']}")
        print(f"    总消费金额: RMB {analysis_data.summary['total_spending']:.2f}")
        print(f"    覆盖城市数: {analysis_data.summary['total_cities']}")
        print(f"    最热门城市: {analysis_data.summary['top_city']}")
        print(f"    热门城市行程数: {analysis_data.summary['top_city_count']}")
        
        print("")
        print("  城市热度分布:")
        for hotspot in analysis_data.city_hotspots:
            print(f"    - {hotspot.name}: {hotspot.count} 条行程, 平均预算: RMB {hotspot.avg_budget:.2f}, 总消费: RMB {hotspot.total_spending:.2f}")
        
        print("")
        print("  验证数据一致性...")
        
        assert analysis_data.summary["total_itineraries"] == total_itineraries, \
            f"总行程数不匹配: 期望 {total_itineraries}, 实际 {analysis_data.summary['total_itineraries']}"
        print("  [OK] 总行程数验证通过")
        
        assert abs(analysis_data.summary["total_spending"] - total_spending) < 0.01, \
            f"总消费金额不匹配: 期望 {total_spending}, 实际 {analysis_data.summary['total_spending']}"
        print("  [OK] 总消费金额验证通过")
        
        assert analysis_data.summary["total_cities"] == total_cities, \
            f"覆盖城市数不匹配: 期望 {total_cities}, 实际 {analysis_data.summary['total_cities']}"
        print("  [OK] 覆盖城市数验证通过")
        
        assert analysis_data.summary["top_city"] == "北京", \
            f"最热门城市不匹配: 期望 北京, 实际 {analysis_data.summary['top_city']}"
        print("  [OK] 最热门城市验证通过")
        
        assert analysis_data.summary["top_city_count"] == 5, \
            f"热门城市行程数不匹配: 期望 5, 实际 {analysis_data.summary['top_city_count']}"
        print("  [OK] 热门城市行程数验证通过")
        
        for hotspot in analysis_data.city_hotspots:
            expected = expected_totals[hotspot.name]
            
            assert hotspot.count == expected["count"], \
                f"{hotspot.name} 行程数不匹配: 期望 {expected['count']}, 实际 {hotspot.count}"
            
            assert abs(hotspot.avg_budget * hotspot.count - expected["budget"]) < 0.01, \
                f"{hotspot.name} 总预算不匹配: 期望 {expected['budget']}, 实际 {hotspot.avg_budget * hotspot.count}"
            
            assert abs(hotspot.total_spending - expected["spending"]) < 0.01, \
                f"{hotspot.name} 总消费不匹配: 期望 {expected['spending']}, 实际 {hotspot.total_spending}"
            
            print(f"  [OK] {hotspot.name} 数据验证通过")
        
        print("")
        print("=" * 60)
        print("所有验证通过! 聚合数据逻辑正确")
        print("=" * 60)
    
    @pytest.mark.asyncio
    async def test_date_filtering(self):
        """测试日期筛选功能"""
        
        print("")
        print("=" * 60)
        print("测试日期筛选功能")
        print("=" * 60)
        
        itinerary1 = self.create_test_itinerary("上海", 5000.0, 4500.0)
        create1 = ItineraryCreate(**itinerary1)
        saved1 = itinerary_service.create_itinerary(create1, user_id=1)
        
        itinerary2 = self.create_test_itinerary("北京", 8000.0, 7500.0)
        create2 = ItineraryCreate(**itinerary2)
        saved2 = itinerary_service.create_itinerary(create2, user_id=1)
        
        current_month = datetime.now().strftime("%Y-%m")
        next_month = "2026-12"
        
        print("")
        print(f"  当前月份: {current_month}")
        print("  插入了 2 条行程数据")
        
        analysis_all = stats_service.get_analysis_data()
        print("")
        print(f"  不使用筛选时的总行程数: {analysis_all.summary['total_itineraries']}")
        assert analysis_all.summary["total_itineraries"] == 2
        
        analysis_filtered = stats_service.get_analysis_data(
            start_date=next_month,
            end_date=next_month
        )
        print(f"  使用日期筛选 ({next_month}) 时的总行程数: {analysis_filtered.summary['total_itineraries']}")
        assert analysis_filtered.summary["total_itineraries"] == 0
        
        print("")
        print("  [OK] 日期筛选功能验证通过")
    
    @pytest.mark.asyncio
    async def test_destination_filtering(self):
        """测试目的地类别筛选功能"""
        
        print("")
        print("=" * 60)
        print("测试目的地类别筛选功能")
        print("=" * 60)
        
        test_data = [
            {"destination": "上海", "budget": 5000.0, "estimated_total_cost": 4500.0},
            {"destination": "北京", "budget": 8000.0, "estimated_total_cost": 7500.0},
            {"destination": "杭州", "budget": 3000.0, "estimated_total_cost": 2800.0},
        ]
        
        for item in test_data:
            itinerary_data = self.create_test_itinerary(
                destination=item["destination"],
                budget=item["budget"],
                estimated_total_cost=item["estimated_total_cost"]
            )
            itinerary_create = ItineraryCreate(**itinerary_data)
            itinerary_service.create_itinerary(itinerary_create, user_id=1)
        
        print("")
        print("  插入了 3 条行程数据: 上海、北京、杭州")
        
        analysis_all = stats_service.get_analysis_data()
        print(f"  不使用筛选时的总行程数: {analysis_all.summary['total_itineraries']}")
        assert analysis_all.summary["total_itineraries"] == 3
        assert analysis_all.summary["total_cities"] == 3
        
        analysis_filtered = stats_service.get_analysis_data(
            destination_categories=["上海", "北京"]
        )
        print(f"  筛选 [上海, 北京] 时的总行程数: {analysis_filtered.summary['total_itineraries']}")
        print(f"  筛选 [上海, 北京] 时的覆盖城市数: {analysis_filtered.summary['total_cities']}")
        
        assert analysis_filtered.summary["total_itineraries"] == 2
        assert analysis_filtered.summary["total_cities"] == 2
        
        cities = [h.name for h in analysis_filtered.city_hotspots]
        assert "上海" in cities
        assert "北京" in cities
        assert "杭州" not in cities
        
        print("")
        print("  [OK] 目的地类别筛选功能验证通过")
    
    @pytest.mark.asyncio
    async def test_empty_data(self):
        """测试空数据场景"""
        
        print("")
        print("=" * 60)
        print("测试空数据场景")
        print("=" * 60)
        
        analysis_data = stats_service.get_analysis_data()
        
        print("")
        print(f"  总行程数: {analysis_data.summary['total_itineraries']}")
        print(f"  总消费金额: {analysis_data.summary['total_spending']}")
        print(f"  覆盖城市数: {analysis_data.summary['total_cities']}")
        
        assert analysis_data.summary["total_itineraries"] == 0
        assert analysis_data.summary["total_spending"] == 0.0
        assert analysis_data.summary["total_cities"] == 0
        assert analysis_data.summary["top_city"] is None
        assert analysis_data.summary["top_city_count"] == 0
        
        assert len(analysis_data.city_hotspots) == 0
        assert len(analysis_data.monthly_trends) == 0
        
        print("")
        print("  [OK] 空数据场景验证通过")
    
    @pytest.mark.asyncio
    async def test_average_budget_calculation(self):
        """测试平均预算计算逻辑"""
        
        print("")
        print("=" * 60)
        print("测试平均预算计算逻辑")
        print("=" * 60)
        
        test_data = [
            {"destination": "上海", "budget": 5000.0, "count": 2},
            {"destination": "上海", "budget": 7000.0, "count": 1},
        ]
        
        for item in test_data:
            for i in range(item["count"]):
                itinerary_data = self.create_test_itinerary(
                    destination=item["destination"],
                    budget=item["budget"],
                    estimated_total_cost=item["budget"] * 0.9
                )
                itinerary_create = ItineraryCreate(**itinerary_data)
                itinerary_service.create_itinerary(itinerary_create, user_id=1)
        
        expected_avg_budget = (5000.0 * 2 + 7000.0 * 1) / 3
        
        print("")
        print("  上海行程数据:")
        print(f"    2 条预算 RMB 5000.00")
        print(f"    1 条预算 RMB 7000.00")
        print(f"    预期平均预算: RMB {expected_avg_budget:.2f}")
        
        analysis_data = stats_service.get_analysis_data()
        
        shanghai_hotspot = next(h for h in analysis_data.city_hotspots if h.name == "上海")
        
        print(f"  实际平均预算: RMB {shanghai_hotspot.avg_budget:.2f}")
        
        assert abs(shanghai_hotspot.avg_budget - expected_avg_budget) < 0.01
        assert shanghai_hotspot.count == 3
        
        print("")
        print("  [OK] 平均预算计算逻辑验证通过")


if __name__ == "__main__":
    import pytest
    import sys
    
    sys.exit(pytest.main([__file__, "-v", "--no-header", "-s"]))
