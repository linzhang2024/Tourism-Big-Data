import pytest
import sys
import os
import time
from httpx import AsyncClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app
from app.services.tenant_service import tenant_service
from app.services.role_service import role_service
from app.services.permission_service import permission_service
from app.models.role import RoleCreate
from app.models.permission import PermissionCreate, PermissionType, PermissionCategory


@pytest.fixture(autouse=True)
def reset_services():
    original_tenants = tenant_service.tenants.copy()
    original_tenant_next_id = tenant_service.next_id
    original_tenant_usage = tenant_service.tenant_usage.copy()
    
    original_roles = role_service.roles.copy()
    original_role_next_id = role_service.next_id
    
    original_permissions = permission_service.permissions.copy()
    original_permission_next_id = permission_service.next_id
    
    tenant_service.tenants = []
    tenant_service.next_id = 1
    tenant_service.tenant_usage = {}
    
    role_service.roles = []
    role_service.next_id = 1
    
    permission_service.permissions = []
    permission_service.next_id = 1
    
    yield
    
    tenant_service.tenants = original_tenants
    tenant_service.next_id = original_tenant_next_id
    tenant_service.tenant_usage = original_tenant_usage
    
    role_service.roles = original_roles
    role_service.next_id = original_role_next_id
    
    permission_service.permissions = original_permissions
    permission_service.next_id = original_permission_next_id


def create_many_permissions(count: int):
    for i in range(count):
        perm = PermissionCreate(
            name=f"测试权限_{i+1}",
            code=f"test:perm_{i+1}",
            permission_type=PermissionType.DATA,
            category=PermissionCategory.DATA_OPERATIONS,
            description=f"测试用权限 {i+1}"
        )
        permission_service.create_permission(perm)


class TestTenantCloningPerformance:
    
    @pytest.mark.asyncio
    async def test_clone_tenant_with_many_permissions(self):
        """测试克隆拥有50+权限项的租户，验证响应时间在500ms以内"""
        
        create_many_permissions(60)
        
        test_role = RoleCreate(
            name="测试高级角色",
            code="TEST_ADVANCED",
            description="拥有大量权限的测试角色"
        )
        created_role = role_service.create_role(test_role)
        
        all_permissions = permission_service.get_all_permissions()
        role_service.add_permissions_to_role("TEST_ADVANCED", all_permissions)
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            create_response = await client.post(
                "/api/tenants/",
                json={
                    "name": "源租户-高性能测试",
                    "code": "SOURCE_PERF_TEST",
                    "description": "用于性能测试的源租户",
                    "itinerary_limit": 1000,
                    "ai_calls_limit": 500,
                    "allowed_role_codes": ["TEST_ADVANCED"]
                }
            )
            
        assert create_response.status_code in [200, 201]
        source_tenant = create_response.json()
        source_tenant_id = source_tenant["id"]
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            start_time = time.perf_counter()
            
            clone_response = await client.post(
                f"/api/tenants/{source_tenant_id}/clone",
                json={
                    "name": "克隆租户-性能测试",
                    "code": "CLONED_PERF_TEST",
                    "clone_roles": True,
                    "clone_permissions": True,
                    "clone_config": True
                }
            )
            
            end_time = time.perf_counter()
            response_time_ms = (end_time - start_time) * 1000
        
        assert clone_response.status_code in [200, 201], f"克隆请求失败: {clone_response.text}"
        
        cloned_tenant = clone_response.json()
        assert cloned_tenant["name"] == "克隆租户-性能测试"
        assert cloned_tenant["code"] == "CLONED_PERF_TEST"
        assert "id" in cloned_tenant
        
        assert cloned_tenant["cloned_roles_count"] >= 1, f"期望克隆至少1个角色，实际: {cloned_tenant['cloned_roles_count']}"
        assert cloned_tenant["cloned_permissions_count"] >= 50, f"期望克隆至少50个权限，实际: {cloned_tenant['cloned_permissions_count']}"
        
        print(f"\n{'='*60}")
        print(f"[性能测试结果] 克隆接口响应时间: {response_time_ms:.2f} ms")
        print(f"[性能测试结果] 克隆角色数量: {cloned_tenant['cloned_roles_count']}")
        print(f"[性能测试结果] 克隆权限数量: {cloned_tenant['cloned_permissions_count']}")
        print(f"{'='*60}\n")
        
        assert response_time_ms < 500, f"响应时间 {response_time_ms:.2f} ms 超过 500 ms 阈值"
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            get_response = await client.get(f"/api/tenants/{cloned_tenant['id']}")
        
        assert get_response.status_code == 200
        cloned_detail = get_response.json()
        
        assert cloned_detail["itinerary_limit"] == 1000, f"配额配置未正确克隆: itinerary_limit={cloned_detail['itinerary_limit']}"
        assert cloned_detail["ai_calls_limit"] == 500, f"配额配置未正确克隆: ai_calls_limit={cloned_detail['ai_calls_limit']}"
        assert "TEST_ADVANCED" in cloned_detail["allowed_role_codes"], f"角色未正确克隆: allowed_role_codes={cloned_detail['allowed_role_codes']}"
        
        print(f"[数据验证] 配额配置: itinerary_limit={cloned_detail['itinerary_limit']}, ai_calls_limit={cloned_detail['ai_calls_limit']}")
        print(f"[数据验证] 允许的角色: {cloned_detail['allowed_role_codes']}")
    
    @pytest.mark.asyncio
    async def test_clone_tenant_without_roles(self):
        """测试不克隆角色的情况"""
        
        create_many_permissions(10)
        
        test_role = RoleCreate(
            name="测试角色",
            code="TEST_ROLE",
            description="测试角色"
        )
        role_service.create_role(test_role)
        
        all_permissions = permission_service.get_all_permissions()
        role_service.add_permissions_to_role("TEST_ROLE", all_permissions)
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            create_response = await client.post(
                "/api/tenants/",
                json={
                    "name": "源租户",
                    "code": "SOURCE_TEST",
                    "itinerary_limit": 500,
                    "ai_calls_limit": 200,
                    "allowed_role_codes": ["TEST_ROLE"]
                }
            )
            
        assert create_response.status_code in [200, 201]
        source_tenant = create_response.json()
        source_tenant_id = source_tenant["id"]
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            clone_response = await client.post(
                f"/api/tenants/{source_tenant_id}/clone",
                json={
                    "name": "克隆租户-无角色",
                    "code": "CLONED_NO_ROLES",
                    "clone_roles": False,
                    "clone_permissions": False,
                    "clone_config": True
                }
            )
        
        assert clone_response.status_code in [200, 201]
        cloned_tenant = clone_response.json()
        
        assert cloned_tenant["cloned_roles_count"] == 0, f"期望克隆0个角色，实际: {cloned_tenant['cloned_roles_count']}"
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            get_response = await client.get(f"/api/tenants/{cloned_tenant['id']}")
        
        cloned_detail = get_response.json()
        assert cloned_detail["itinerary_limit"] == 500
        assert cloned_detail["ai_calls_limit"] == 200
    
    @pytest.mark.asyncio
    async def test_clone_duplicate_code(self):
        """测试克隆使用已存在的租户代码应返回业务错误码 40001"""
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            create_response = await client.post(
                "/api/tenants/",
                json={
                    "name": "源租户",
                    "code": "SOURCE_DUP",
                }
            )
            
        assert create_response.status_code in [200, 201]
        source_tenant = create_response.json()
        source_tenant_id = source_tenant["id"]
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            clone_response = await client.post(
                f"/api/tenants/{source_tenant_id}/clone",
                json={
                    "name": "克隆租户",
                    "code": "SOURCE_DUP",
                    "clone_roles": True,
                    "clone_permissions": True,
                    "clone_config": True
                }
            )
        
        assert clone_response.status_code == 200, f"期望返回200状态码（业务错误通过code字段区分），实际: {clone_response.status_code}"
        
        error_data = clone_response.json()
        print(f"\n[错误响应验证] 重复代码错误响应: {error_data}")
        
        assert "code" in error_data, "错误响应应包含 code 字段"
        assert "message" in error_data, "错误响应应包含 message 字段"
        assert error_data["code"] == 40001, f"期望业务错误码 40001，实际: {error_data['code']}"
        assert "SOURCE_DUP" in error_data["message"], f"错误消息应包含租户代码，实际: {error_data['message']}"
        assert "已存在" in error_data["message"], f"错误消息应包含'已存在'，实际: {error_data['message']}"
        assert "请更换后重试" in error_data["message"], f"错误消息应包含'请更换后重试'，实际: {error_data['message']}"
    
    @pytest.mark.asyncio
    async def test_clone_nonexistent_tenant(self):
        """测试克隆不存在的租户应返回业务错误码 40002"""
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            clone_response = await client.post(
                "/api/tenants/999999/clone",
                json={
                    "name": "克隆租户",
                    "code": "CLONED_NONEXIST",
                    "clone_roles": True,
                    "clone_permissions": True,
                    "clone_config": True
                }
            )
        
        assert clone_response.status_code == 200, f"期望返回200状态码（业务错误通过code字段区分），实际: {clone_response.status_code}"
        
        error_data = clone_response.json()
        print(f"\n[错误响应验证] 不存在租户错误响应: {error_data}")
        
        assert "code" in error_data, "错误响应应包含 code 字段"
        assert "message" in error_data, "错误响应应包含 message 字段"
        assert error_data["code"] == 40002, f"期望业务错误码 40002，实际: {error_data['code']}"
        assert "999999" in error_data["message"], f"错误消息应包含租户ID，实际: {error_data['message']}"
        assert "不存在" in error_data["message"], f"错误消息应包含'不存在'，实际: {error_data['message']}"
    
    @pytest.mark.asyncio
    async def test_clone_disabled_tenant(self):
        """测试克隆已禁用的租户应返回业务错误码 40003"""
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            create_response = await client.post(
                "/api/tenants/",
                json={
                    "name": "已禁用租户",
                    "code": "DISABLED_TENANT",
                }
            )
            
            assert create_response.status_code in [200, 201]
            source_tenant = create_response.json()
            source_tenant_id = source_tenant["id"]
            
            update_response = await client.put(
                f"/api/tenants/{source_tenant_id}",
                json={
                    "is_active": False
                }
            )
            
            assert update_response.status_code in [200, 201]
            updated_tenant = update_response.json()
            assert updated_tenant["is_active"] == False
            
            clone_response = await client.post(
                f"/api/tenants/{source_tenant_id}/clone",
                json={
                    "name": "克隆租户",
                    "code": "CLONED_DISABLED",
                    "clone_roles": True,
                    "clone_permissions": True,
                    "clone_config": True
                }
            )
        
        assert clone_response.status_code == 200, f"期望返回200状态码（业务错误通过code字段区分），实际: {clone_response.status_code}"
        
        error_data = clone_response.json()
        print(f"\n[错误响应验证] 已禁用租户错误响应: {error_data}")
        
        assert "code" in error_data, "错误响应应包含 code 字段"
        assert "message" in error_data, "错误响应应包含 message 字段"
        assert error_data["code"] == 40003, f"期望业务错误码 40003，实际: {error_data['code']}"
        assert "已禁用租户" in error_data["message"], f"错误消息应包含租户名称，实际: {error_data['message']}"
        assert "已被禁用" in error_data["message"], f"错误消息应包含'已被禁用'，实际: {error_data['message']}"


if __name__ == "__main__":
    import pytest
    import sys
    
    sys.exit(pytest.main([__file__, "-v", "--no-header", "-s"]))
