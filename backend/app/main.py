import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.itinerary import router as itinerary_router
from app.api.trend import router as trend_router
from app.api.role import router as role_router
from app.api.permission import router as permission_router
from app.api.auth import router as auth_router
from app.api.stats import router as stats_router
from app.api.tenant import router as tenant_router
from app.services.role_service import role_service
from app.services.permission_service import permission_service
from app.services.user_service import user_service
from app.services.tenant_service import tenant_service
from app.models.role import RoleCreate
from app.models.permission import PermissionCreate, PermissionCode
from app.utils.log_broadcaster import log_broadcaster, setup_websocket_logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def initialize_roles():
    default_roles = [
        RoleCreate(
            name="管理员",
            code="ADMIN",
            description="系统管理员角色，拥有最高权限"
        ),
        RoleCreate(
            name="普通用户",
            code="USER",
            description="普通用户角色，拥有基本操作权限"
        )
    ]
    
    for role in default_roles:
        if not role_service.role_exists_by_code(role.code):
            created_role = role_service.create_role(role)
            logger.info(f"[权限初始化] 创建角色: {created_role.name} ({created_role.code})")


def initialize_permissions():
    default_permissions = [
        PermissionCreate(
            name="查看数据",
            code=PermissionCode.DATA_VIEW,
            description="查看系统数据的权限"
        ),
        PermissionCreate(
            name="导出数据",
            code=PermissionCode.DATA_EXPORT,
            description="导出系统数据的权限"
        ),
        PermissionCreate(
            name="启动爬虫",
            code=PermissionCode.SPIDER_RUN,
            description="启动数据爬虫任务的权限"
        ),
        PermissionCreate(
            name="系统管理",
            code=PermissionCode.SYS_MANAGE,
            description="系统管理相关操作的权限"
        ),
        PermissionCreate(
            name="查看行程",
            code=PermissionCode.ITINERARY_VIEW,
            description="查看行程列表和详情的权限"
        ),
        PermissionCreate(
            name="创建行程",
            code=PermissionCode.ITINERARY_CREATE,
            description="创建新行程的权限"
        ),
        PermissionCreate(
            name="更新行程",
            code=PermissionCode.ITINERARY_UPDATE,
            description="更新行程信息的权限"
        ),
        PermissionCreate(
            name="删除行程",
            code=PermissionCode.ITINERARY_DELETE,
            description="删除行程的权限"
        )
    ]
    
    for permission in default_permissions:
        if not permission_service.permission_exists_by_code(permission.code):
            created_perm = permission_service.create_permission(permission)
            logger.info(f"[权限初始化] 创建权限: {created_perm.name} ({created_perm.code})")


def initialize_role_permissions():
    all_permissions = permission_service.get_all_permissions()
    logger.info(f"[权限初始化] 开始为角色分配权限，共 {len(all_permissions)} 个权限")
    
    admin_count = role_service.add_permissions_to_role("ADMIN", all_permissions)
    logger.info(f"[权限初始化] 为 ADMIN 角色分配了 {admin_count} 个权限")
    
    data_view_perm = permission_service.get_permission_by_code(PermissionCode.DATA_VIEW)
    if data_view_perm:
        user_count = role_service.add_permissions_to_role("USER", [data_view_perm])
        logger.info(f"[权限初始化] 为 USER 角色分配了 {user_count} 个权限 (data:view)")
    else:
        logger.warning("[权限初始化] 未找到 data:view 权限")
    
    admin_role = role_service.get_role_by_code("ADMIN")
    user_role = role_service.get_role_by_code("USER")
    
    if admin_role:
        logger.info(f"[权限初始化] ADMIN 角色当前权限: {[p.code for p in admin_role.permissions]}")
    if user_role:
        logger.info(f"[权限初始化] USER 角色当前权限: {[p.code for p in user_role.permissions]}")
    
    logger.info("[权限初始化] 权限分配完成")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[系统初始化] 开始系统初始化...")
    setup_websocket_logging()
    initialize_roles()
    initialize_permissions()
    initialize_role_permissions()
    user_service.initialize_default_users()
    tenant_service.initialize_default_tenants()
    logger.info("[系统初始化] 系统初始化完成")
    yield


app = FastAPI(
    title="智能旅游行程规划 API",
    description="基于 AI 的智能旅游行程规划平台后端 API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(itinerary_router, prefix="/api/itinerary", tags=["行程规划"])
app.include_router(trend_router, prefix="/api/trends", tags=["旅游趋势"])
app.include_router(role_router, prefix="/api/roles", tags=["角色管理"])
app.include_router(permission_router, prefix="/api/permissions", tags=["权限管理"])
app.include_router(auth_router, prefix="/api/auth", tags=["认证"])
app.include_router(stats_router, prefix="/api/stats", tags=["统计数据"])
app.include_router(tenant_router, prefix="/api/tenants", tags=["租户管理"])


@app.get("/")
async def root():
    return {"message": "智能旅游行程规划 API 服务运行中"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.websocket("/api/logs")
async def websocket_logs(websocket: WebSocket):
    await log_broadcaster.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            logger.info(f"[WebSocket] 收到客户端消息: {data}")
    except WebSocketDisconnect:
        log_broadcaster.disconnect(websocket)
    except Exception as e:
        logger.error(f"[WebSocket] 连接错误: {e}")
        log_broadcaster.disconnect(websocket)
