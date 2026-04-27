import pytest
import sys
import os
from httpx import AsyncClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app
from app.services.role_service import role_service


@pytest.fixture(autouse=True)
def reset_role_service():
    original_roles = role_service.roles.copy()
    original_next_id = role_service.next_id
    role_service.roles = []
    role_service.next_id = 1
    yield
    role_service.roles = original_roles
    role_service.next_id = original_next_id


class TestRoleAPI:
    
    @pytest.mark.asyncio
    async def test_create_role_success(self):
        """测试创建角色成功 - 创建名为 TEST_ROLE 的角色"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.post(
                "/api/roles/",
                json={
                    "name": "测试角色",
                    "code": "TEST_ROLE",
                    "description": "用于测试的角色"
                }
            )
        
        assert response.status_code in [200, 201]
        
        data = response.json()
        assert data["name"] == "测试角色"
        assert data["code"] == "TEST_ROLE"
        assert data["description"] == "用于测试的角色"
        assert "id" in data
        assert "created_at" in data
    
    @pytest.mark.asyncio
    async def test_get_roles_empty(self):
        """测试获取空角色列表"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/roles/")
        
        assert response.status_code == 200
        assert response.json() == []
    
    @pytest.mark.asyncio
    async def test_get_roles_after_creation(self):
        """测试创建角色后获取角色列表"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            create_response = await client.post(
                "/api/roles/",
                json={
                    "name": "测试角色",
                    "code": "TEST_ROLE",
                    "description": "用于测试的角色"
                }
            )
            assert create_response.status_code in [200, 201]
            
            get_response = await client.get("/api/roles/")
        
        assert get_response.status_code == 200
        roles = get_response.json()
        assert len(roles) == 1
        assert roles[0]["code"] == "TEST_ROLE"
    
    @pytest.mark.asyncio
    async def test_create_duplicate_role_code(self):
        """测试创建重复角色代码应返回错误"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            first_response = await client.post(
                "/api/roles/",
                json={
                    "name": "测试角色1",
                    "code": "TEST_ROLE",
                    "description": "第一个测试角色"
                }
            )
            assert first_response.status_code in [200, 201]
            
            second_response = await client.post(
                "/api/roles/",
                json={
                    "name": "测试角色2",
                    "code": "TEST_ROLE",
                    "description": "第二个测试角色（重复代码）"
                }
            )
        
        assert second_response.status_code == 400
        assert "已存在" in second_response.json()["detail"]
