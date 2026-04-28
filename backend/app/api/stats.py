import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from datetime import datetime

from app.models.stats import StatsResponse, BasicStats, DetailedStats, AdminStats
from app.models.permission import PermissionCode
from app.utils.jwt_utils import jwt_utils
from app.services.role_service import role_service
from app.services.user_service import user_service
from app.services.permission_service import permission_service

logger = logging.getLogger(__name__)
router = APIRouter()

security = HTTPBearer(auto_error=False)


def get_current_user_permissions(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if not credentials:
        logger.warning("[统计 API] 访问被拒绝: 未提供 Token")
        raise HTTPException(
            status_code=401,
            detail="未提供认证 Token"
        )
    
    token = credentials.credentials
    logger.info(f"[统计 API] 收到 Token 验证请求，Token 长度: {len(token)}")
    
    user_info = jwt_utils.get_user_from_token(token)
    
    if not user_info:
        logger.warning("[统计 API] Token 验证失败")
        raise HTTPException(
            status_code=401,
            detail="Token 无效或已过期"
        )
    
    username = user_info["username"]
    role_code = user_info["role"]
    
    logger.info(f"[统计 API] Token 验证成功: 用户 '{username}'，角色 '{role_code}'")
    
    role = role_service.get_role_by_code(role_code)
    if not role:
        logger.error(f"[统计 API] 角色 '{role_code}' 不存在")
        raise HTTPException(
            status_code=500,
            detail="用户角色配置错误"
        )
    
    permissions = [p.code for p in role.permissions]
    logger.info(f"[统计 API] 用户 '{username}' 拥有的权限: {permissions}")
    
    return {
        "username": username,
        "role_code": role_code,
        "permissions": permissions
    }


def generate_mock_stats() -> dict:
    return {
        "total_users": 100,
        "total_itineraries": 500,
        "total_cities": 50,
        "active_users_last_7_days": 35,
        "avg_itineraries_per_user": 5.0,
        "top_destinations": ["北京", "上海", "杭州", "成都", "西安"],
        "total_permissions": 4,
        "total_roles": 2,
        "recent_logins": [
            {"username": "admin", "login_time": "2026-04-27 09:30:00", "ip": "127.0.0.1"},
            {"username": "user", "login_time": "2026-04-27 10:15:00", "ip": "192.168.1.100"},
            {"username": "admin", "login_time": "2026-04-28 08:00:00", "ip": "127.0.0.1"},
        ]
    }


def determine_access_level(permissions: List[str]) -> str:
    has_data_view = PermissionCode.DATA_VIEW in permissions
    has_data_export = PermissionCode.DATA_EXPORT in permissions
    has_sys_manage = PermissionCode.SYS_MANAGE in permissions
    
    if has_sys_manage:
        return "admin"
    elif has_data_export:
        return "detailed"
    elif has_data_view:
        return "basic"
    else:
        return "none"


@router.get("/", response_model=StatsResponse)
async def get_stats(user_info: dict = Depends(get_current_user_permissions)):
    username = user_info["username"]
    role_code = user_info["role_code"]
    permissions = user_info["permissions"]
    
    logger.info(f"[统计 API] 用户 '{username}' (角色: {role_code}) 请求统计数据")
    logger.info(f"[统计 API] 用户权限: {permissions}")
    
    access_level = determine_access_level(permissions)
    logger.info(f"[统计 API] 确定访问级别: {access_level}")
    
    if access_level == "none":
        logger.warning(f"[统计 API] 用户 '{username}' 没有访问统计数据的权限")
        raise HTTPException(
            status_code=403,
            detail="您没有访问统计数据的权限"
        )
    
    mock_data = generate_mock_stats()
    stats_data = {}
    
    if access_level == "basic":
        logger.info(f"[统计 API] 返回基础级别数据给用户 '{username}'")
        stats_data = {
            "total_users": mock_data["total_users"],
            "total_itineraries": mock_data["total_itineraries"],
            "total_cities": mock_data["total_cities"]
        }
    elif access_level == "detailed":
        logger.info(f"[统计 API] 返回详细级别数据给用户 '{username}'")
        stats_data = {
            "total_users": mock_data["total_users"],
            "total_itineraries": mock_data["total_itineraries"],
            "total_cities": mock_data["total_cities"],
            "active_users_last_7_days": mock_data["active_users_last_7_days"],
            "avg_itineraries_per_user": mock_data["avg_itineraries_per_user"],
            "top_destinations": mock_data["top_destinations"]
        }
    elif access_level == "admin":
        logger.info(f"[统计 API] 返回管理员级别数据给用户 '{username}'")
        stats_data = {
            "total_users": mock_data["total_users"],
            "total_itineraries": mock_data["total_itineraries"],
            "total_cities": mock_data["total_cities"],
            "active_users_last_7_days": mock_data["active_users_last_7_days"],
            "avg_itineraries_per_user": mock_data["avg_itineraries_per_user"],
            "top_destinations": mock_data["top_destinations"],
            "total_permissions": mock_data["total_permissions"],
            "total_roles": mock_data["total_roles"],
            "recent_logins": mock_data["recent_logins"]
        }
    
    response = StatsResponse(
        access_level=access_level,
        data_retrieved_at=datetime.now(),
        stats=stats_data,
        user_role=role_code,
        user_permissions=permissions
    )
    
    logger.info(f"[统计 API] 成功返回统计数据给用户 '{username}'")
    logger.info(f"[统计 API] 响应内容: {response.model_dump()}")
    
    return response
