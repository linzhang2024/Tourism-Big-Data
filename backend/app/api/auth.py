import logging
from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from pydantic import BaseModel, Field

from app.models.user import LoginRequest, LoginResponse, UserResponse, UserCreate, UserStatus
from app.services.user_service import user_service
from app.services.role_service import role_service
from app.services.tenant_service import tenant_service
from app.utils.jwt_utils import jwt_utils
from app.utils.tenant_context import tenant_context

logger = logging.getLogger(__name__)
router = APIRouter()

security = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")
    email: Optional[str] = Field(None, description="邮箱")
    tenant_id: int = Field(..., description="目标租户ID")


class RejectRequest(BaseModel):
    reason: Optional[str] = Field(None, description="驳回原因")


class LoginErrorDetail(BaseModel):
    detail: str
    error_code: str


def get_user_permissions(role_code: str, tenant_id: Optional[int] = None) -> list:
    logger.info(f"[权限获取] 开始获取权限: role_code='{role_code}', tenant_id={tenant_id}")
    
    if tenant_id:
        tenant = tenant_service.get_tenant_by_id(tenant_id)
        if tenant:
            logger.info(f"[权限获取] 找到租户: {tenant.name} (代码: {tenant.code}), allowed_role_codes={tenant.allowed_role_codes}")
            
            # 关键修复：检查 allowed_role_codes is not None 而不是布尔值
            # 空列表 [] 表示租户配置了允许角色列表但没有选择任何角色
            if tenant.allowed_role_codes is not None:
                if len(tenant.allowed_role_codes) == 0:
                    logger.warning(f"[权限获取] 租户 '{tenant.name}' 的 allowed_role_codes 为空列表，将使用默认 USER 角色权限")
                    base_role = role_service.get_role_by_code("USER")
                    if base_role:
                        permissions = [p.code for p in base_role.permissions]
                        logger.info(f"[权限获取] 空角色列表降级成功，使用 USER 角色权限: {permissions}")
                        return permissions
                    logger.error("[权限获取] 无法获取 USER 角色权限")
                    return []
                
                if role_code not in tenant.allowed_role_codes:
                    logger.warning(f"[权限获取] 用户角色 '{role_code}' 不在租户允许的角色列表 {tenant.allowed_role_codes} 中，将降级为 USER 角色权限")
                    base_role = role_service.get_role_by_code("USER")
                    if base_role:
                        permissions = [p.code for p in base_role.permissions]
                        logger.info(f"[权限获取] 角色降级成功，使用 USER 角色权限: {permissions}")
                        return permissions
                    logger.error("[权限获取] 无法获取 USER 角色权限")
                    return []
                else:
                    logger.info(f"[权限获取] 用户角色 '{role_code}' 在租户允许列表中，将使用原角色权限")
            else:
                logger.info(f"[权限获取] 租户 '{tenant.name}' 未配置 allowed_role_codes，将直接使用原角色权限")
        else:
            logger.warning(f"[权限获取] 未找到租户 ID={tenant_id}，将直接使用原角色权限")
    
    role = role_service.get_role_by_code(role_code)
    if role:
        permissions = [p.code for p in role.permissions]
        logger.info(f"[权限获取] 使用角色 '{role_code}' 的权限: {permissions}")
        return permissions
    
    logger.error(f"[权限获取] 未找到角色 '{role_code}'")
    return []


def get_current_user_dependency(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> UserResponse:
    tenant_context.clear()
    
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
    
    tenant_id = user_info.get("tenant_id")
    user_id = user_info.get("user_id")
    
    tenant_context.set_tenant_id(tenant_id)
    tenant_context.set_user_id(user_id)
    
    logger.info(f"[权限校验] 设置租户上下文: tenant_id={tenant_id}, user_id={user_id}")
    
    permissions = get_user_permissions(user.role_code, tenant_id)
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role_code=user.role_code,
        tenant_id=user.tenant_id,
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
        logger.info(f"[权限校验] 需要所有权限: {required_permissions}")
        
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


def require_any_permission(required_permissions: List[str]):
    def permission_checker(
        current_user: UserResponse = Depends(get_current_user_dependency)
    ) -> UserResponse:
        user_permissions = current_user.permissions
        logger.info(f"[权限校验] 用户 '{current_user.username}' 权限: {user_permissions}")
        logger.info(f"[权限校验] 需要任一权限: {required_permissions}")
        
        has_any = False
        for permission in required_permissions:
            if permission in user_permissions:
                has_any = True
                break
        
        if not has_any:
            logger.warning(f"[权限校验] 用户 '{current_user.username}' 缺少任一所需权限: {required_permissions}")
            raise HTTPException(
                status_code=403,
                detail=f"缺少权限，需要: {required_permissions} 中的任一权限"
            )
        
        logger.info(f"[权限校验] 用户 '{current_user.username}' 权限验证通过")
        return current_user
    
    return permission_checker


@router.post("/login", response_model=LoginResponse)
async def login(login_request: LoginRequest):
    logger.info(f"[认证 API] 收到登录请求: 用户名='{login_request.username}'")
    
    db_user = user_service.get_user_by_username(login_request.username)
    
    if db_user and not user_service.verify_password(login_request.password, db_user.hashed_password):
        logger.warning(f"[认证 API] 登录失败: 密码错误 - '{login_request.username}'")
        raise HTTPException(
            status_code=401,
            detail="用户名或密码错误"
        )
    
    if db_user and db_user.status == UserStatus.PENDING:
        logger.warning(f"[认证 API] 登录失败: 用户 '{login_request.username}' 状态为待审核")
        raise HTTPException(
            status_code=403,
            detail="您的账号正在审核中，请等待管理员审批"
        )
    
    if db_user and db_user.status == UserStatus.REJECTED:
        logger.warning(f"[认证 API] 登录失败: 用户 '{login_request.username}' 状态为已拒绝")
        raise HTTPException(
            status_code=403,
            detail="您的账号申请已被拒绝，请联系管理员"
        )
    
    user = user_service.authenticate_user(login_request.username, login_request.password)
    
    if not user:
        logger.warning(f"[认证 API] 登录失败: 用户名不存在 - '{login_request.username}'")
        raise HTTPException(
            status_code=401,
            detail="用户名或密码错误"
        )
    
    logger.info(f"[认证 API] 登录成功: 用户 '{user.username}'，角色 '{user.role_code}'，租户ID '{user.tenant_id}'")
    
    permissions = get_user_permissions(user.role_code, user.tenant_id)
    logger.info(f"[认证 API] 用户 '{user.username}' 的权限: {permissions}")
    
    access_token = jwt_utils.create_access_token(user)
    
    logger.info(f"[认证 API] 生成 JWT Token 成功，长度: {len(access_token)} 字符")
    
    user_with_permissions = UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role_code=user.role_code,
        tenant_id=user.tenant_id,
        status=user.status,
        created_at=user.created_at,
        updated_at=user.updated_at,
        permissions=permissions
    )
    
    response = LoginResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_with_permissions
    )
    
    logger.info(f"[认证 API] 返回登录响应: 用户ID={user.id}, 用户名={user.username}, 角色={user.role_code}, 租户ID={user.tenant_id}, 权限={permissions}")
    
    return response


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(register_request: RegisterRequest):
    logger.info(f"[认证 API] 收到注册请求: 用户名='{register_request.username}', 租户ID={register_request.tenant_id}")
    
    try:
        user_create = UserCreate(
            username=register_request.username,
            password=register_request.password,
            email=register_request.email,
            tenant_id=register_request.tenant_id,
            role_code="USER",
            status=UserStatus.PENDING
        )
        
        created_user = user_service.register_user(user_create)
        
        logger.info(f"[认证 API] 注册申请提交成功: 用户 '{created_user.username}', 状态='{created_user.status}'")
        
        return created_user
        
    except ValueError as e:
        logger.warning(f"[认证 API] 注册失败: {str(e)}")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"[认证 API] 注册过程中发生错误: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="注册失败，请稍后重试"
        )


@router.get("/pending", response_model=List[UserResponse])
async def get_pending_users(
    current_user: UserResponse = Depends(get_current_user_dependency)
):
    logger.info(f"[认证 API] 用户 '{current_user.username}' 请求获取待审核用户列表")
    
    if 'sys:manage' not in current_user.permissions:
        logger.warning(f"[认证 API] 用户 '{current_user.username}' 无权限访问待审核列表")
        raise HTTPException(
            status_code=403,
            detail="无权限访问待审核用户列表"
        )
    
    pending_users = user_service.get_pending_users()
    logger.info(f"[认证 API] 获取到 {len(pending_users)} 个待审核用户")
    
    return pending_users


@router.get("/rejected", response_model=List[UserResponse])
async def get_rejected_users(
    current_user: UserResponse = Depends(get_current_user_dependency)
):
    logger.info(f"[认证 API] 用户 '{current_user.username}' 请求获取已驳回用户列表")
    
    if 'sys:manage' not in current_user.permissions:
        logger.warning(f"[认证 API] 用户 '{current_user.username}' 无权限访问已驳回列表")
        raise HTTPException(
            status_code=403,
            detail="无权限访问已驳回用户列表"
        )
    
    rejected_users = user_service.get_rejected_users()
    logger.info(f"[认证 API] 获取到 {len(rejected_users)} 个已驳回用户")
    
    return rejected_users


@router.post("/approve/{user_id}", response_model=UserResponse)
async def approve_user(
    user_id: int,
    current_user: UserResponse = Depends(get_current_user_dependency)
):
    logger.info(f"[认证 API] 用户 '{current_user.username}' 尝试审批通过用户 ID={user_id}")
    
    if 'sys:manage' not in current_user.permissions:
        logger.warning(f"[认证 API] 用户 '{current_user.username}' 无权限执行审批操作")
        raise HTTPException(
            status_code=403,
            detail="无权限执行审批操作"
        )
    
    approved_user = user_service.approve_user(user_id)
    
    if not approved_user:
        logger.warning(f"[认证 API] 审批失败: 用户 ID={user_id} 不存在或状态不是待审核")
        raise HTTPException(
            status_code=400,
            detail="用户不存在或状态不是待审核"
        )
    
    logger.info(f"[认证 API] 用户 ID={user_id} 审批通过成功")
    return approved_user


@router.post("/reject/{user_id}")
async def reject_user(
    user_id: int,
    reject_request: RejectRequest = Body(default=RejectRequest()),
    current_user: UserResponse = Depends(get_current_user_dependency)
):
    logger.info(f"[认证 API] 用户 '{current_user.username}' 尝试驳回用户 ID={user_id}")
    
    if 'sys:manage' not in current_user.permissions:
        logger.warning(f"[认证 API] 用户 '{current_user.username}' 无权限执行驳回操作")
        raise HTTPException(
            status_code=403,
            detail="无权限执行驳回操作"
        )
    
    success = user_service.reject_user(user_id, reject_request.reason)
    
    if not success:
        logger.warning(f"[认证 API] 驳回失败: 用户 ID={user_id} 不存在或状态不是待审核")
        raise HTTPException(
            status_code=400,
            detail="用户不存在或状态不是待审核"
        )
    
    logger.info(f"[认证 API] 用户 ID={user_id} 驳回成功")
    return {"detail": "用户已被驳回", "user_id": user_id}


@router.get("/me", response_model=UserResponse)
async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    tenant_context.clear()
    
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
    
    tenant_id = user_info.get("tenant_id")
    user_id = user_info.get("user_id")
    tenant_context.set_tenant_id(tenant_id)
    tenant_context.set_user_id(user_id)
    logger.info(f"[认证 API] 设置租户上下文: tenant_id={tenant_id}, user_id={user_id}")
    
    permissions = get_user_permissions(user.role_code, tenant_id)
    logger.info(f"[认证 API] Token 验证成功: 用户 '{user.username}'，角色 '{user.role_code}'，租户ID '{user.tenant_id}'，权限: {permissions}")
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role_code=user.role_code,
        tenant_id=user.tenant_id,
        created_at=user.created_at,
        updated_at=user.updated_at,
        permissions=permissions
    )
