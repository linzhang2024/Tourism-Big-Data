import pytest
import sys
import os
from httpx import AsyncClient
from unittest.mock import patch, MagicMock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app
from app.services.permission_service import permission_service
from app.services.role_service import role_service
from app.services.user_service import user_service
from app.services.tenant_service import tenant_service
from app.models.permission import PermissionCreate, PermissionType, PermissionCode
from app.models.role import RoleCreate
from app.models.user import UserCreate, UserStatus


@pytest.fixture(autouse=True)
def reset_services():
    original_permissions = permission_service.permissions.copy()
    original_perm_next_id = permission_service.next_id
    
    original_roles = role_service.roles.copy()
    original_role_next_id = role_service.next_id
    
    original_users = user_service.users.copy()
    original_user_next_id = user_service.next_id
    
    original_tenants = tenant_service.tenants.copy()
    original_tenant_next_id = tenant_service.next_id
    original_tenant_usage = {k: v.copy() for k, v in tenant_service.tenant_usage.items()}
    
    yield
    
    permission_service.permissions = original_permissions
    permission_service.next_id = original_perm_next_id
    
    role_service.roles = original_roles
    role_service.next_id = original_role_next_id
    
    user_service.users = original_users
    user_service.next_id = original_user_next_id
    
    tenant_service.tenants = original_tenants
    tenant_service.next_id = original_tenant_next_id
    tenant_service.tenant_usage = original_tenant_usage


def setup_test_environment():
    from app.main import initialize_permissions, initialize_roles, initialize_role_permissions
    
    initialize_permissions()
    initialize_roles()
    initialize_role_permissions()
    
    tenant_service.initialize_default_tenants()
    user_service.initialize_default_users()


class TestMenuPermissions:
    
    @pytest.mark.asyncio
    async def test_menu_permissions_initialized(self):
        """测试菜单权限是否正确初始化"""
        from app.main import initialize_permissions
        initialize_permissions()
        
        menu_perms = permission_service.get_menu_permissions()
        
        menu_codes = [p.code for p in menu_perms]
        assert "menu:dashboard" in menu_codes
        assert "menu:insights" in menu_codes
        assert "menu:itinerary" in menu_codes
        assert "menu:profile" in menu_codes
        assert "menu:tenants" in menu_codes
        assert "menu:roles" in menu_codes
        assert "menu:permissions" in menu_codes
    
    @pytest.mark.asyncio
    async def test_data_permissions_initialized(self):
        """测试数据权限是否正确初始化"""
        from app.main import initialize_permissions
        initialize_permissions()
        
        data_perms = permission_service.get_data_permissions()
        
        data_codes = [p.code for p in data_perms]
        assert "data:view" in data_codes
        assert "data:export" in data_codes
        assert "spider:run" in data_codes
        assert "sys:manage" in data_codes
        assert "itinerary:view" in data_codes
        assert "itinerary:create" in data_codes
        assert "itinerary:update" in data_codes
        assert "itinerary:delete" in data_codes
    
    @pytest.mark.asyncio
    async def test_admin_role_has_all_menu_permissions(self):
        """测试管理员角色是否拥有所有菜单权限"""
        from app.main import initialize_permissions, initialize_roles, initialize_role_permissions
        initialize_permissions()
        initialize_roles()
        initialize_role_permissions()
        
        admin_role = role_service.get_role_by_code("ADMIN")
        assert admin_role is not None
        
        menu_codes = [p.code for p in admin_role.permissions if p.permission_type == PermissionType.MENU]
        assert "menu:dashboard" in menu_codes
        assert "menu:insights" in menu_codes
        assert "menu:itinerary" in menu_codes
        assert "menu:profile" in menu_codes
        assert "menu:tenants" in menu_codes
        assert "menu:roles" in menu_codes
        assert "menu:permissions" in menu_codes


class TestTenantRoleBinding:
    
    @pytest.mark.asyncio
    async def test_tenant_has_allowed_roles(self):
        """测试租户是否有允许的角色配置"""
        from app.main import initialize_permissions, initialize_roles, initialize_role_permissions
        initialize_permissions()
        initialize_roles()
        initialize_role_permissions()
        
        tenant_service.initialize_default_tenants()
        
        tenant_a = tenant_service.get_tenant_by_code("TENANT_A")
        assert tenant_a is not None
        assert "ADMIN" in tenant_a.allowed_role_codes
        assert "USER" in tenant_a.allowed_role_codes
        
        tenant_b = tenant_service.get_tenant_by_code("TENANT_B")
        assert tenant_b is not None
        assert "USER" in tenant_b.allowed_role_codes
    
    @pytest.mark.asyncio
    async def test_user_in_tenant_without_admin_role_gets_limited_permissions(self):
        """测试租户B的管理员角色用户应该只能获得USER角色权限"""
        from app.main import initialize_permissions, initialize_roles, initialize_role_permissions
        from app.api.auth import get_user_permissions
        
        initialize_permissions()
        initialize_roles()
        initialize_role_permissions()
        tenant_service.initialize_default_tenants()
        user_service.initialize_default_users()
        
        tenant_b = tenant_service.get_tenant_by_code("TENANT_B")
        assert tenant_b is not None
        
        permissions = get_user_permissions("ADMIN", tenant_b.id)
        
        admin_role = role_service.get_role_by_code("ADMIN")
        user_role = role_service.get_role_by_code("USER")
        
        assert len(permissions) == len([p.code for p in user_role.permissions])
        
        for p in user_role.permissions:
            assert p.code in permissions
        
        for p in admin_role.permissions:
            if p.code not in [up.code for up in user_role.permissions]:
                assert p.code not in permissions


class TestBackendAuthorization:
    
    @pytest.mark.asyncio
    async def test_unauthorized_access_to_protected_endpoint_returns_403(self):
        """测试绕过前端直接请求无权接口时返回403"""
        setup_test_environment()
        
        from app.utils.jwt_utils import jwt_utils
        
        regular_user = user_service.get_user_by_username("user")
        assert regular_user is not None
        assert regular_user.role_code == "USER"
        
        user_response = user_service._to_response(regular_user)
        token = jwt_utils.create_access_token(user_response)
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/api/auth/pending",
                headers={"Authorization": f"Bearer {token}"}
            )
        
        assert response.status_code == 403
        error_detail = response.json()
        assert "无权限" in error_detail.get("detail", "")
    
    @pytest.mark.asyncio
    async def test_admin_can_access_protected_endpoint(self):
        """测试管理员可以访问受保护的端点"""
        setup_test_environment()
        
        from app.utils.jwt_utils import jwt_utils
        
        admin_user = user_service.get_user_by_username("admin")
        assert admin_user is not None
        assert admin_user.role_code == "ADMIN"
        
        admin_response = user_service._to_response(admin_user)
        token = jwt_utils.create_access_token(admin_response)
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/api/auth/pending",
                headers={"Authorization": f"Bearer {token}"}
            )
        
        assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_tenant_b_admin_gets_user_permissions(self):
        """测试租户B的管理员应该被降级为USER角色权限"""
        setup_test_environment()
        
        from app.utils.jwt_utils import jwt_utils
        
        tenant_b_admin = user_service.get_user_by_username("tenant_b_admin")
        assert tenant_b_admin is not None
        assert tenant_b_admin.role_code == "ADMIN"
        
        admin_response = user_service._to_response(tenant_b_admin)
        token = jwt_utils.create_access_token(admin_response)
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/api/auth/me",
                headers={"Authorization": f"Bearer {token}"}
            )
        
        assert response.status_code == 200
        user_data = response.json()
        
        user_role = role_service.get_role_by_code("USER")
        admin_role = role_service.get_role_by_code("ADMIN")
        
        user_perm_codes = [p.code for p in user_role.permissions]
        admin_perm_codes = [p.code for p in admin_role.permissions]
        
        user_returned_perms = user_data.get("permissions", [])
        
        for up_code in user_perm_codes:
            assert up_code in user_returned_perms
        
        for ap_code in admin_perm_codes:
            if ap_code not in user_perm_codes:
                assert ap_code not in user_returned_perms
    
    @pytest.mark.asyncio
    async def test_no_token_returns_401(self):
        """测试没有Token时返回401"""
        setup_test_environment()
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/auth/pending")
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_invalid_token_returns_401(self):
        """测试无效Token时返回401"""
        setup_test_environment()
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get(
                "/api/auth/pending",
                headers={"Authorization": "Bearer invalid_token_123"}
            )
        
        assert response.status_code == 401


class TestPermissionTypeSeparation:
    
    def test_permission_has_type_field(self):
        """测试权限模型包含类型字段"""
        perm = PermissionCreate(
            name="测试菜单权限",
            code="menu:test",
            permission_type=PermissionType.MENU,
            description="测试用菜单权限"
        )
        
        assert perm.permission_type == PermissionType.MENU
        assert perm.code == "menu:test"
        
        data_perm = PermissionCreate(
            name="测试数据权限",
            code="data:test",
            permission_type=PermissionType.DATA,
            description="测试用数据权限"
        )
        
        assert data_perm.permission_type == PermissionType.DATA
    
    def test_get_permissions_by_type(self):
        """测试按类型获取权限"""
        from app.main import initialize_permissions
        initialize_permissions()
        
        menu_perms = permission_service.get_menu_permissions()
        data_perms = permission_service.get_data_permissions()
        
        all_perms = permission_service.get_all_permissions()
        
        assert len(menu_perms) + len(data_perms) == len(all_perms)
        
        for p in menu_perms:
            assert p.permission_type == PermissionType.MENU
        
        for p in data_perms:
            assert p.permission_type == PermissionType.DATA


if __name__ == "__main__":
    import pytest
    import sys
    
    sys.exit(pytest.main([__file__, "-v", "--no-header"]))
