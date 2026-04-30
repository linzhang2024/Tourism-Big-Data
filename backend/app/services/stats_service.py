import logging
from typing import List, Dict, Any, Optional
from collections import defaultdict
from datetime import datetime
from copy import deepcopy

from app.services.user_service import user_service
from app.services.role_service import role_service
from app.services.permission_service import permission_service
from app.services.itinerary_service import itinerary_service
from app.models.stats import CityHotspot, MonthlyTrend, AnalysisResponse

logger = logging.getLogger(__name__)


class StatsService:
    def __init__(self):
        self._mock_itineraries_count: int = 156
        self._mock_cities: List[str] = [
            "北京", "上海", "杭州", "成都", "西安",
            "重庆", "广州", "深圳", "苏州", "南京",
            "武汉", "长沙", "青岛", "大连", "厦门"
        ]
        self._mock_recent_logins: List[Dict[str, Any]] = [
            {"username": "admin", "login_time": "2026-04-27 09:30:00", "ip": "127.0.0.1"},
            {"username": "user", "login_time": "2026-04-27 10:15:00", "ip": "192.168.1.100"},
            {"username": "admin", "login_time": "2026-04-28 08:00:00", "ip": "127.0.0.1"},
        ]

    def get_total_users(self) -> int:
        users = user_service.get_all_users()
        count = len(users)
        logger.info(f"[统计服务] 获取总用户数: {count}")
        return count

    def get_total_roles(self) -> int:
        roles = role_service.get_all_roles()
        count = len(roles)
        logger.info(f"[统计服务] 获取总角色数: {count}")
        return count

    def get_total_permissions(self) -> int:
        permissions = permission_service.get_all_permissions()
        count = len(permissions)
        logger.info(f"[统计服务] 获取总权限数: {count}")
        return count

    def get_total_itineraries(self) -> int:
        logger.info(f"[统计服务] 获取总行程数: {self._mock_itineraries_count}")
        return self._mock_itineraries_count

    def get_total_cities(self) -> int:
        count = len(self._mock_cities)
        logger.info(f"[统计服务] 获取总城市数: {count}")
        return count

    def get_top_destinations(self, limit: int = 5) -> List[str]:
        top = self._mock_cities[:limit]
        logger.info(f"[统计服务] 获取热门目的地: {top}")
        return top

    def get_active_users_last_7_days(self) -> int:
        active = 23
        logger.info(f"[统计服务] 获取过去7天活跃用户数: {active}")
        return active

    def get_avg_itineraries_per_user(self) -> float:
        total_users = self.get_total_users()
        if total_users == 0:
            return 0.0
        avg = round(self._mock_itineraries_count / total_users, 2)
        logger.info(f"[统计服务] 获取平均每用户行程数: {avg}")
        return avg

    def get_recent_logins(self) -> List[Dict[str, Any]]:
        logger.info(f"[统计服务] 获取最近登录记录: {self._mock_recent_logins}")
        return self._mock_recent_logins

    def get_basic_stats(self) -> Dict[str, Any]:
        logger.info("[统计服务] 获取基础统计数据")
        return {
            "total_users": self.get_total_users(),
            "total_itineraries": self.get_total_itineraries(),
            "total_cities": self.get_total_cities()
        }

    def get_detailed_stats(self) -> Dict[str, Any]:
        logger.info("[统计服务] 获取详细统计数据")
        basic = self.get_basic_stats()
        return {
            **basic,
            "active_users_last_7_days": self.get_active_users_last_7_days(),
            "avg_itineraries_per_user": self.get_avg_itineraries_per_user(),
            "top_destinations": self.get_top_destinations()
        }

    def get_admin_stats(self) -> Dict[str, Any]:
        logger.info("[统计服务] 获取管理员统计数据")
        detailed = self.get_detailed_stats()
        return {
            **detailed,
            "total_permissions": self.get_total_permissions(),
            "total_roles": self.get_total_roles(),
            "recent_logins": self.get_recent_logins()
        }

    def _filter_itineraries_by_date(
        self, 
        itineraries: List, 
        start_date: Optional[str] = None, 
        end_date: Optional[str] = None
    ) -> List:
        if not start_date and not end_date:
            return itineraries
        
        filtered = []
        for itinerary in itineraries:
            created_month = itinerary.created_at.strftime("%Y-%m")
            
            if start_date and created_month < start_date:
                continue
            if end_date and created_month > end_date:
                continue
            
            filtered.append(itinerary)
        
        logger.info(f"[统计服务] 日期筛选: 原始 {len(itineraries)} 条，筛选后 {len(filtered)} 条")
        return filtered

    def _filter_itineraries_by_categories(
        self, 
        itineraries: List, 
        categories: Optional[List[str]] = None
    ) -> List:
        if not categories or len(categories) == 0:
            return itineraries
        
        filtered = []
        for itinerary in itineraries:
            if itinerary.destination in categories:
                filtered.append(itinerary)
        
        logger.info(f"[统计服务] 类别筛选: 原始 {len(itineraries)} 条，筛选后 {len(filtered)} 条")
        return filtered

    def _calculate_city_hotspots(self, itineraries: List) -> List[CityHotspot]:
        city_stats = defaultdict(lambda: {
            "count": 0,
            "total_budget": 0.0,
            "total_spending": 0.0
        })
        
        for itinerary in itineraries:
            city = itinerary.destination
            budget = itinerary.budget or 0.0
            spending = itinerary.estimated_total_cost or 0.0
            
            city_stats[city]["count"] += 1
            city_stats[city]["total_budget"] += budget
            city_stats[city]["total_spending"] += spending
        
        hotspots = []
        for city, stats in city_stats.items():
            count = stats["count"]
            avg_budget = stats["total_budget"] / count if count > 0 else 0.0
            hotspots.append(CityHotspot(
                name=city,
                count=count,
                avg_budget=round(avg_budget, 2),
                total_spending=round(stats["total_spending"], 2)
            ))
        
        hotspots.sort(key=lambda x: x.count, reverse=True)
        
        logger.info(f"[统计服务] 计算城市热度: 共 {len(hotspots)} 个城市")
        return hotspots

    def _calculate_monthly_trends(self, itineraries: List) -> List[MonthlyTrend]:
        monthly_stats = defaultdict(lambda: {
            "count": 0,
            "total_spending": 0.0,
            "total_budget": 0.0
        })
        
        for itinerary in itineraries:
            month = itinerary.created_at.strftime("%Y-%m")
            budget = itinerary.budget or 0.0
            spending = itinerary.estimated_total_cost or 0.0
            
            monthly_stats[month]["count"] += 1
            monthly_stats[month]["total_spending"] += spending
            monthly_stats[month]["total_budget"] += budget
        
        trends = []
        for month, stats in monthly_stats.items():
            count = stats["count"]
            avg_budget = stats["total_budget"] / count if count > 0 else 0.0
            trends.append(MonthlyTrend(
                month=month,
                total_itineraries=count,
                total_spending=round(stats["total_spending"], 2),
                avg_budget=round(avg_budget, 2)
            ))
        
        trends.sort(key=lambda x: x.month)
        
        logger.info(f"[统计服务] 计算月度趋势: 共 {len(trends)} 个月份")
        return trends

    def get_analysis_data(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        destination_categories: Optional[List[str]] = None
    ) -> AnalysisResponse:
        logger.info(f"[统计服务] 开始数据分析: start_date={start_date}, end_date={end_date}, categories={destination_categories}")
        
        all_itineraries = itinerary_service.get_all_itineraries()
        logger.info(f"[统计服务] 获取到 {len(all_itineraries)} 条行程数据")
        
        filtered = self._filter_itineraries_by_date(all_itineraries, start_date, end_date)
        filtered = self._filter_itineraries_by_categories(filtered, destination_categories)
        
        if len(filtered) == 0:
            logger.warning("[统计服务] 筛选后无数据")
        
        city_hotspots = self._calculate_city_hotspots(filtered)
        monthly_trends = self._calculate_monthly_trends(filtered)
        
        total_itineraries = len(filtered)
        total_spending = sum(h.total_spending for h in city_hotspots)
        total_budget = sum(h.avg_budget * h.count for h in city_hotspots)
        
        summary = {
            "total_itineraries": total_itineraries,
            "total_spending": round(total_spending, 2),
            "total_budget": round(total_budget, 2),
            "avg_spending_per_itinerary": round(total_spending / total_itineraries, 2) if total_itineraries > 0 else 0.0,
            "total_cities": len(city_hotspots),
            "top_city": city_hotspots[0].name if len(city_hotspots) > 0 else None,
            "top_city_count": city_hotspots[0].count if len(city_hotspots) > 0 else 0
        }
        
        response = AnalysisResponse(
            generated_at=datetime.now(),
            period={
                "start_date": start_date,
                "end_date": end_date
            },
            city_hotspots=city_hotspots,
            monthly_trends=monthly_trends,
            summary=summary
        )
        
        logger.info(f"[统计服务] 数据分析完成: 汇总={summary}")
        return response


stats_service = StatsService()
