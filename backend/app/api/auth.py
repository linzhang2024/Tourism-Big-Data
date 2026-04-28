import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List

from app.models.user import LoginRequest, LoginResponse, UserResponse
from app.services.user_service import user_service
from app.services.role_service import role_service
from app.utils.jwt_utils import jwt_utils

logger = logging.getLogger(__name__)
router = APIRouter()

security = HTTPBearer(auto_error=False)


def get_user_permissions(role_code: str) -> list:
    role = role_service.get_role_by_code(role_code)
    if role:
        return [p.code for p in role.permissions]
    return []


def get_current_user_dependency(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> UserResponse:
    if not credentials:
        logger.warning("[权限校验] 未提供 Token")
        raise HTTPException(
            status_code=401,
            detail="未提供认证 Token"
        )
    
    token = credentials.credentials
    user_info = jwt_utils.get_user_from_token(token)
    
    if not user_info:
        logger.warning("[权限校验] Token 无效或已过期")
        raise HTTPException(
            status_code=401,
            detail="Token 无效或已过期"
        )
    
    user = user_service.get_user_by_username(user_info["username"])
    
    if not user:
        logger.warning(f"[权限校验] Token 中的用户不存在: {user_info['username']}")
        raise HTTPException(
            status_code=401,
            detail="用户不存在"
        )
    
    permissions = get_user_permissions(user.role_code)
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role_code=user.role_code,
        created_at=user.created_at,
        updated_at=user.updated_at,
        permissions=permissions
    )


def require_permissions(required_permissions: List[str]):
    def permission_checker(
        current_user: UserResponse = Depends(get_current_user_dependency)
    ) -> UserResponse:
        user_permissions = current_user.permissions
        logger.info(f"[权限校验] 用户 '{current_user.username}' 权限: {user_permissions}")
        logger.info(f"[权限校验] 需要权限: {required_permissions}")
        
        for permission in required_permissions:
            if permission not in user_permissions:
                logger.warning(f"[权限校验] 用户 '{current_user.username}' 缺少权限: {permission}")
                raise HTTPException(
                    status_code=403,
                    detail=f"缺少权限: {permission}"
                )
        
        logger.info(f"[权限校验] 用户 '{current_user.username}' 权限验证通过")
        return current_user
    
    return permission_checker


@router.post("/login", response_model=LoginResponse)
async def login(login_request: LoginRequest):
    logger.info(f"[认证 API] 收到登录请求: 用户名='{login_request.username}'")
    
    user = user_service.authenticate_user(login_request.username, login_request.password)
    
    if not user:
        logger.warning(f"[认证 API] 登录失败: 用户名或密码错误 - '{login_request.username}'")
        raise HTTPException(
            status_code=401,
            detail="用户名或密码错误"
        )
    
    logger.info(f"[认证 API] 登录成功: 用户 '{user.username}'，角色 '{user.role_code}'")
    
    permissions = get_user_permissions(user.role_code)
    logger.info(f"[认证 API] 用户 '{user.username}' 的权限: {permissions}")
    
    access_token = jwt_utils.create_access_token(user)
    
    logger.info(f"[认证 API] 生成 JWT Token 成功，长度: {len(access_token)} 字符")
    
    user_with_permissions = UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role_code=user.role_code,
        created_at=user.created_at,
        updated_at=user.updated_at,
        permissions=permissions
    )
    
    response = LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_with_permissions
    )
    
    logger.info(f"[认证 API] 返回登录响应: 用户ID={user.id}, 用户名={user.username}, 角色={user.role_code}, 权限={permissions}")
    
    return response


@router.get("/me", response_model=UserResponse)
async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not credentials:
        logger.warning("[认证 API] 获取当前用户失败: 未提供 Token")
        raise HTTPException(
            status_code=401,
            detail="未提供认证 Token"
        )
    
    token = credentials.credentials
    logger.info(f"[认证 API] 收到 Token 验证请求，Token 长度: {len(token)}")
    
    user_info = jwt_utils.get_user_from_token(token)
    
    if not user_info:
        logger.warning("[认证 API] Token 验证失败")
        raise HTTPException(
            status_code=401,
            detail="Token 无效或已过期"
        )
    
    user = user_service.get_user_by_username(user_info["username"])
    
    if not user:
        logger.warning(f"[认证 API] Token 中的用户不存在: {user_info['username']}")
        raise HTTPException(
            status_code=401,
            detail="用户不存在"
        )
    
    permissions = get_user_permissions(user.role_code)
    logger.info(f"[认证 API] Token 验证成功: 用户 '{user.username}'，角色 '{user.role_code}'，权限: {permissions}")
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role_code=user.role_code,
        created_at=user.created_at,
        updated_at=user.updated_at,
        permissions=permissions
    )
