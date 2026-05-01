import pytest
import sys
import os
from httpx import AsyncClient
from typing import Optional

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app
from app.services.tenant_service import tenant_service
from app.services.user_service import user_service
from app.services.itinerary_service import itinerary_service
from app.services.role_service import role_service
from app.services.permission_service import permission_service
from app.utils.tenant_context import tenant_context
from app.utils.cache_manager import cache_manager
from app.models.itinerary import ItineraryCreate, DayPlan, Activity, InterestPreference
from app.models.user import UserCreate
from app.models.role import RoleCreate
from app.models.permission import PermissionCreate, PermissionCode
from app.models.tenant import TenantCreate


def initialize_roles_and_permissions():
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
            permission_service.create_permission(permission)
    
    all_permissions = permission_service.get_all_permissions()
    role_service.add_permissions_to_role("ADMIN", all_permissions)
    
    data_view_perm = permission_service.get_permission_by_code(PermissionCode.DATA_VIEW)
    if data_view_perm:
        role_service.add_permissions_to_role("USER", [data_view_perm])


@pytest.fixture(autouse=True)
def reset_services():
    tenant_service.tenants = []
    tenant_service.next_id = 1
    
    user_service.users = []
    user_service.next_id = 1
    
    itinerary_service.itineraries = []
    itinerary_service.next_id = 1
    
    role_service.roles = []
    role_service.next_id = 1
    
    permission_service.permissions = []
    permission_service.next_id = 1
    
    tenant_context.clear()
    cache_manager.clear()
    
    initialize_roles_and_permissions()
    
    yield
    
    tenant_context.clear()
    cache_manager.clear()


def create_test_itinerary(title: str, destination: str = "北京") -> ItineraryCreate:
    return ItineraryCreate(
        title=title,
        departure="上海",
        destination=destination,
        days=3,
        budget=5000.0,
        estimated_total_cost=4500.0,
        daily_plans=[
            DayPlan(
                day=1,
                activities=[
                    Activity(time="09:00-11:00", name="参观故宫", description="参观北京故宫", location="北京市东城区")
                ],
                summary="第一天：北京文化之旅"
            )
        ],
        tips=["建议提前预订门票"],
        interests=[InterestPreference.CULTURE],
        travel_style="文化游",
        is_ai_generated=False
    )


async def login_user(client: AsyncClient, username: str, password: str) -> Optional[str]:
    response = await client.post(
        "/api/auth/login",
        json={"username": username, "password": password}
    )
    if response.status_code == 200:
        return response.json()["access_token"]
    return None


class TestTenancyIsolation:
    
    def setup_tenants_and_users(self):
        tenant_system = tenant_service.create_tenant(
            TenantCreate(name="系统默认租户", code="SYSTEM", description="系统默认租户")
        )
        tenant_a = tenant_service.create_tenant(
            TenantCreate(name="租户A", code="TENANT_A", description="示例租户A")
        )
        tenant_b = tenant_service.create_tenant(
            TenantCreate(name="租户B", code="TENANT_B", description="示例租户B")
        )
        
        admin_user = UserCreate(
            username="admin",
            password="admin123",
            email="admin@tourism.com",
            role_code="ADMIN",
            tenant_id=tenant_a.id
        )
        user_service.create_user(admin_user)
        
        regular_user = UserCreate(
            username="user",
            password="user123",
            email="user@tourism.com",
            role_code="USER",
            tenant_id=tenant_a.id
        )
        user_service.create_user(regular_user)
        
        tenant_a_admin = UserCreate(
            username="tenant_a_admin",
            password="admin123",
            email="admin_a@tourism.com",
            role_code="ADMIN",
            tenant_id=tenant_a.id
        )
        user_service.create_user(tenant_a_admin)
        
        tenant_b_admin = UserCreate(
            username="tenant_b_admin",
            password="admin123",
            email="admin_b@tourism.com",
            role_code="ADMIN",
            tenant_id=tenant_b.id
        )
        user_service.create_user(tenant_b_admin)
        
        tenant_b_user = UserCreate(
            username="tenant_b_user",
            password="user123",
            email="user_b@tourism.com",
            role_code="USER",
            tenant_id=tenant_b.id
        )
        user_service.create_user(tenant_b_user)
        
        return tenant_a, tenant_b
    
    @pytest.mark.asyncio
    async def test_tenant_a_user_cannot_access_tenant_b_itinerary_by_id(self):
        tenant_a, tenant_b = self.setup_tenants_and_users()
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            token_a = await login_user(client, "tenant_a_admin", "admin123")
            token_b = await login_user(client, "tenant_b_admin", "admin123")
            
            assert token_a is not None
            assert token_b is not None
            
            itinerary_a = create_test_itinerary("租户A的行程-北京之旅", "北京")
            response = await client.post(
                "/api/itinerary/",
                json=itinerary_a.model_dump(),
                headers={"Authorization": f"Bearer {token_a}"}
            )
            assert response.status_code == 201
            itinerary_a_data = response.json()
            itinerary_a_id = itinerary_a_data["id"]
            assert itinerary_a_data["tenant_id"] == tenant_a.id
            
            itinerary_b = create_test_itinerary("租户B的行程-上海之旅", "上海")
            response = await client.post(
                "/api/itinerary/",
                json=itinerary_b.model_dump(),
                headers={"Authorization": f"Bearer {token_b}"}
            )
            assert response.status_code == 201
            itinerary_b_data = response.json()
            itinerary_b_id = itinerary_b_data["id"]
            assert itinerary_b_data["tenant_id"] == tenant_b.id
            
            response = await client.get(
                f"/api/itinerary/{itinerary_a_id}",
                headers={"Authorization": f"Bearer {token_a}"}
            )
            assert response.status_code == 200
            assert response.json()["title"] == "租户A的行程-北京之旅"
            
            response = await client.get(
                f"/api/itinerary/{itinerary_b_id}",
                headers={"Authorization": f"Bearer {token_b}"}
            )
            assert response.status_code == 200
            assert response.json()["title"] == "租户B的行程-上海之旅"
            
            response = await client.get(
                f"/api/itinerary/{itinerary_b_id}",
                headers={"Authorization": f"Bearer {token_a}"}
            )
            assert response.status_code == 404, f"租户A不应该能访问租户B的行程，实际状态码: {response.status_code}"
            
            response = await client.get(
                f"/api/itinerary/{itinerary_a_id}",
                headers={"Authorization": f"Bearer {token_b}"}
            )
            assert response.status_code == 404, f"租户B不应该能访问租户A的行程，实际状态码: {response.status_code}"
    
    @pytest.mark.asyncio
    async def test_tenant_a_user_cannot_see_tenant_b_itineraries_in_list(self):
        self.setup_tenants_and_users()
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            token_a = await login_user(client, "tenant_a_admin", "admin123")
            token_b = await login_user(client, "tenant_b_admin", "admin123")
            
            assert token_a is not None
            assert token_b is not None
            
            for i in range(3):
                itinerary = create_test_itinerary(f"租户A的行程-{i+1}", f"城市{i+1}")
                response = await client.post(
                    "/api/itinerary/",
                    json=itinerary.model_dump(),
                    headers={"Authorization": f"Bearer {token_a}"}
                )
                assert response.status_code == 201
            
            for i in range(2):
                itinerary = create_test_itinerary(f"租户B的行程-{i+1}", f"城市B{i+1}")
                response = await client.post(
                    "/api/itinerary/",
                    json=itinerary.model_dump(),
                    headers={"Authorization": f"Bearer {token_b}"}
                )
                assert response.status_code == 201
            
            response = await client.get(
                "/api/itinerary/",
                headers={"Authorization": f"Bearer {token_a}"}
            )
            assert response.status_code == 200
            itineraries_a = response.json()
            assert len(itineraries_a) == 3
            for it in itineraries_a:
                assert "租户A的行程" in it["title"]
            
            response = await client.get(
                "/api/itinerary/",
                headers={"Authorization": f"Bearer {token_b}"}
            )
            assert response.status_code == 200
            itineraries_b = response.json()
            assert len(itineraries_b) == 2
            for it in itineraries_b:
                assert "租户B的行程" in it["title"]
    
    @pytest.mark.asyncio
    async def test_tenant_a_user_cannot_update_tenant_b_itinerary(self):
        self.setup_tenants_and_users()
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            token_a = await login_user(client, "tenant_a_admin", "admin123")
            token_b = await login_user(client, "tenant_b_admin", "admin123")
            
            assert token_a is not None
            assert token_b is not None
            
            itinerary_b = create_test_itinerary("租户B的原始行程", "广州")
            response = await client.post(
                "/api/itinerary/",
                json=itinerary_b.model_dump(),
                headers={"Authorization": f"Bearer {token_b}"}
            )
            assert response.status_code == 201
            itinerary_b_data = response.json()
            itinerary_b_id = itinerary_b_data["id"]
            
            response = await client.put(
                f"/api/itinerary/{itinerary_b_id}",
                json={"title": "被租户A恶意修改的行程"},
                headers={"Authorization": f"Bearer {token_a}"}
            )
            assert response.status_code == 404, f"租户A不应该能更新租户B的行程，实际状态码: {response.status_code}"
            
            response = await client.get(
                f"/api/itinerary/{itinerary_b_id}",
                headers={"Authorization": f"Bearer {token_b}"}
            )
            assert response.status_code == 200
            assert response.json()["title"] == "租户B的原始行程"
    
    @pytest.mark.asyncio
    async def test_tenant_a_user_cannot_delete_tenant_b_itinerary(self):
        self.setup_tenants_and_users()
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            token_a = await login_user(client, "tenant_a_admin", "admin123")
            token_b = await login_user(client, "tenant_b_admin", "admin123")
            
            assert token_a is not None
            assert token_b is not None
            
            itinerary_b = create_test_itinerary("租户B的行程-待删除", "深圳")
            response = await client.post(
                "/api/itinerary/",
                json=itinerary_b.model_dump(),
                headers={"Authorization": f"Bearer {token_b}"}
            )
            assert response.status_code == 201
            itinerary_b_data = response.json()
            itinerary_b_id = itinerary_b_data["id"]
            
            response = await client.delete(
                f"/api/itinerary/{itinerary_b_id}",
                headers={"Authorization": f"Bearer {token_a}"}
            )
            assert response.status_code == 404, f"租户A不应该能删除租户B的行程，实际状态码: {response.status_code}"
            
            response = await client.get(
                f"/api/itinerary/{itinerary_b_id}",
                headers={"Authorization": f"Bearer {token_b}"}
            )
            assert response.status_code == 200
            
            response = await client.delete(
                f"/api/itinerary/{itinerary_b_id}",
                headers={"Authorization": f"Bearer {token_b}"}
            )
            assert response.status_code == 204
    
    @pytest.mark.asyncio
    async def test_jwt_contains_tenant_id(self):
        tenant_a, tenant_b = self.setup_tenants_and_users()
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/auth/login",
                json={"username": "tenant_a_admin", "password": "admin123"}
            )
            assert response.status_code == 200
            login_data = response.json()
            
            assert "access_token" in login_data
            assert login_data["user"]["tenant_id"] == tenant_a.id
            
            response = await client.post(
                "/api/auth/login",
                json={"username": "tenant_b_admin", "password": "admin123"}
            )
            assert response.status_code == 200
            login_data_b = response.json()
            
            assert login_data_b["user"]["tenant_id"] == tenant_b.id
    
    @pytest.mark.asyncio
    async def test_new_itinerary_bound_to_correct_tenant(self):
        tenant_a, tenant_b = self.setup_tenants_and_users()
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            token_a = await login_user(client, "tenant_a_admin", "admin123")
            token_b = await login_user(client, "tenant_b_admin", "admin123")
            
            assert token_a is not None
            assert token_b is not None
            
            itinerary_a = create_test_itinerary("租户A创建的行程", "杭州")
            response = await client.post(
                "/api/itinerary/",
                json=itinerary_a.model_dump(),
                headers={"Authorization": f"Bearer {token_a}"}
            )
            assert response.status_code == 201
            itinerary_a_data = response.json()
            assert itinerary_a_data["tenant_id"] == tenant_a.id
            
            itinerary_b = create_test_itinerary("租户B创建的行程", "苏州")
            response = await client.post(
                "/api/itinerary/",
                json=itinerary_b.model_dump(),
                headers={"Authorization": f"Bearer {token_b}"}
            )
            assert response.status_code == 201
            itinerary_b_data = response.json()
            assert itinerary_b_data["tenant_id"] == tenant_b.id
    
    @pytest.mark.asyncio
    async def test_no_tenant_context_returns_empty_list(self):
        self.setup_tenants_and_users()
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            token_a = await login_user(client, "tenant_a_admin", "admin123")
            assert token_a is not None
            
            itinerary = create_test_itinerary("测试行程", "南京")
            response = await client.post(
                "/api/itinerary/",
                json=itinerary.model_dump(),
                headers={"Authorization": f"Bearer {token_a}"}
            )
            assert response.status_code == 201
            
            tenant_context.clear()
            itineraries = itinerary_service.get_all_itineraries()
            assert len(itineraries) == 0, "没有租户上下文时应该返回空列表"


if __name__ == "__main__":
    import pytest
    import sys
    
    sys.exit(pytest.main([__file__, "-v", "--no-header"]))
