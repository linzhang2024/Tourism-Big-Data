import pytest
import sys
import os
from httpx import AsyncClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.main import app
from app.services.permission_service import permission_service


@pytest.fixture(autouse=True)
def reset_permission_service():
    original_permissions = permission_service.permissions.copy()
    original_next_id = permission_service.next_id
    permission_service.permissions = []
    permission_service.next_id = 1
    yield
    permission_service.permissions = original_permissions
    permission_service.next_id = original_next_id


class TestPermissionAPI:
    
    @pytest.mark.asyncio
    async def test_get_permissions_empty(self):
        """测试获取空权限列表"""
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/permissions/")
        
        assert response.status_code == 200
        assert response.json() == []
    
    @pytest.mark.asyncio
    async def test_get_permissions_after_initialization(self):
        """测试初始化后获取权限列表，验证包含 data:view 核心权限"""
        from app.main import initialize_permissions
        initialize_permissions()
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            response = await client.get("/api/permissions/")
        
        assert response.status_code == 200
        
        permissions = response.json()
        assert len(permissions) == 4
        
        permission_codes = [p["code"] for p in permissions]
        assert "data:view" in permission_codes
        assert "data:export" in permission_codes
        assert "spider:run" in permission_codes
        assert "sys:manage" in permission_codes


if __name__ == "__main__":
    import pytest
    import sys
    
    sys.exit(pytest.main([__file__, "-v", "--no-header"]))