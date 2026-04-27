from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.itinerary import router as itinerary_router
from app.api.trend import router as trend_router
from app.api.role import router as role_router
from app.services.role_service import role_service
from app.models.role import RoleCreate


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
            role_service.create_role(role)


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_roles()
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


@app.get("/")
async def root():
    return {"message": "智能旅游行程规划 API 服务运行中"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
