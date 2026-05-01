import logging
from typing import List, Optional
from datetime import datetime

from app.models.tenant import TenantCreate, TenantResponse

logger = logging.getLogger(__name__)


class TenantService:
    def __init__(self):
        self.tenants: List[TenantResponse] = []
        self.next_id: int = 1

    def create_tenant(self, tenant_create: TenantCreate) -> TenantResponse:
        tenant = TenantResponse(
            id=self.next_id,
            name=tenant_create.name,
            code=tenant_create.code,
            description=tenant_create.description,
            created_at=datetime.now(),
            is_active=True
        )
        self.tenants.append(tenant)
        self.next_id += 1
        logger.info(f"[租户服务] 创建租户: {tenant.name} (代码: {tenant.code})")
        return tenant

    def get_all_tenants(self) -> List[TenantResponse]:
        return [t for t in self.tenants if t.is_active]

    def get_tenant_by_id(self, tenant_id: int) -> Optional[TenantResponse]:
        for tenant in self.tenants:
            if tenant.id == tenant_id and tenant.is_active:
                return tenant
        return None

    def get_tenant_by_code(self, code: str) -> Optional[TenantResponse]:
        for tenant in self.tenants:
            if tenant.code == code and tenant.is_active:
                return tenant
        return None

    def tenant_exists_by_code(self, code: str) -> bool:
        return self.get_tenant_by_code(code) is not None

    def deactivate_tenant(self, tenant_id: int) -> bool:
        tenant = self.get_tenant_by_id(tenant_id)
        if tenant is None:
            return False
        tenant.is_active = False
        logger.info(f"[租户服务] 停用租户: {tenant.name} (ID: {tenant_id})")
        return True

    def initialize_default_tenants(self):
        default_tenants = [
            TenantCreate(
                name="系统默认租户",
                code="SYSTEM",
                description="系统默认租户，用于初始化"
            ),
            TenantCreate(
                name="租户A",
                code="TENANT_A",
                description="示例租户A"
            ),
            TenantCreate(
                name="租户B",
                code="TENANT_B",
                description="示例租户B"
            )
        ]
        
        for tenant_create in default_tenants:
            if not self.tenant_exists_by_code(tenant_create.code):
                created_tenant = self.create_tenant(tenant_create)
                logger.info(f"[租户初始化] 创建默认租户: {created_tenant.name} (代码: {created_tenant.code})")
            else:
                logger.info(f"[租户初始化] 默认租户已存在: {tenant_create.code}")


tenant_service = TenantService()
