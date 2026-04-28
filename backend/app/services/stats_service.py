import logging
from typing import List, Dict, Any
from datetime import datetime

from app.services.user_service import user_service
from app.services.role_service import role_service
from app.services.permission_service import permission_service

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


stats_service = StatsService()
