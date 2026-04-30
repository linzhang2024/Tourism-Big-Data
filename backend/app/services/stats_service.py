import logging
import json
import csv
import io
from typing import List, Dict, Any, Optional, Generator
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

    def get_export_data(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        destination_categories: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        logger.info(f"[统计服务] 准备导出数据: start_date={start_date}, end_date={end_date}, categories={destination_categories}")
        
        analysis_data = self.get_analysis_data(
            start_date=start_date,
            end_date=end_date,
            destination_categories=destination_categories
        )
        
        export_data = {
            "generated_at": analysis_data.generated_at.isoformat() if analysis_data.generated_at else None,
            "period": analysis_data.period,
            "summary": analysis_data.summary,
            "city_hotspots": [
                {
                    "name": h.name,
                    "count": h.count,
                    "avg_budget": h.avg_budget,
                    "total_spending": h.total_spending
                }
                for h in analysis_data.city_hotspots
            ],
            "monthly_trends": [
                {
                    "month": t.month,
                    "total_itineraries": t.total_itineraries,
                    "total_spending": t.total_spending,
                    "avg_budget": t.avg_budget
                }
                for t in analysis_data.monthly_trends
            ]
        }
        
        logger.info(f"[统计服务] 导出数据准备完成: 汇总={export_data['summary']}")
        return export_data

    def export_to_json(self, export_data: Dict[str, Any]) -> str:
        logger.info("[统计服务] 导出为JSON格式")
        json_str = json.dumps(export_data, ensure_ascii=False, indent=2, default=str)
        return json_str.encode('utf-8')

    def export_to_csv(self, export_data: Dict[str, Any]) -> bytes:
        logger.info("[统计服务] 导出为CSV格式")
        
        output = io.StringIO()
        output.write('\ufeff')
        
        writer = csv.writer(output)
        
        writer.writerow(["行程数据导出报表"])
        writer.writerow(["生成时间", export_data.get("generated_at", "")])
        writer.writerow([])
        
        writer.writerow(["一、数据汇总"])
        summary = export_data.get("summary", {})
        writer.writerow(["指标", "数值"])
        writer.writerow(["总行程数", summary.get("total_itineraries", 0)])
        writer.writerow(["总消费金额", summary.get("total_spending", 0)])
        writer.writerow(["总预算金额", summary.get("total_budget", 0)])
        writer.writerow(["平均每行程消费", summary.get("avg_spending_per_itinerary", 0)])
        writer.writerow(["涉及城市数", summary.get("total_cities", 0)])
        writer.writerow(["最热门城市", summary.get("top_city", "")])
        writer.writerow(["热门城市行程数", summary.get("top_city_count", 0)])
        writer.writerow([])
        
        writer.writerow(["二、城市热度分布"])
        writer.writerow(["城市名称", "行程数量", "平均预算", "总消费金额"])
        for hotspot in export_data.get("city_hotspots", []):
            writer.writerow([
                hotspot.get("name", ""),
                hotspot.get("count", 0),
                hotspot.get("avg_budget", 0),
                hotspot.get("total_spending", 0)
            ])
        writer.writerow([])
        
        writer.writerow(["三、月度趋势"])
        writer.writerow(["月份", "行程总数", "总消费金额", "平均预算"])
        for trend in export_data.get("monthly_trends", []):
            writer.writerow([
                trend.get("month", ""),
                trend.get("total_itineraries", 0),
                trend.get("total_spending", 0),
                trend.get("avg_budget", 0)
            ])
        
        csv_content = output.getvalue()
        return csv_content.encode('utf-8')

    def stream_export_data(
        self,
        export_data: Dict[str, Any],
        format_type: str
    ) -> Generator[bytes, None, None]:
        logger.info(f"[统计服务] 流式导出数据，格式: {format_type}")
        
        if format_type == "json":
            json_bytes = self.export_to_json(export_data)
            yield json_bytes
        elif format_type == "csv":
            csv_bytes = self.export_to_csv(export_data)
            yield csv_bytes
        else:
            raise ValueError(f"不支持的导出格式: {format_type}")


stats_service = StatsService()
