import logging
from typing import List, Optional, Dict, Tuple
from datetime import datetime

from app.models.tenant import (
    TenantCreate, 
    TenantResponse, 
    TenantUpdate, 
    TenantWithQuota,
    QuotaUsage,
    TenantCloneRequest,
    TenantCloneResponse
)

logger = logging.getLogger(__name__)


class TenantService:
    def __init__(self):
        self.tenants: List[TenantResponse] = []
        self.next_id: int = 1
        self.tenant_usage: Dict[int, Dict[str, int]] = {}

    def create_tenant(self, tenant_create: TenantCreate) -> TenantResponse:
        tenant = TenantResponse(
            id=self.next_id,
            name=tenant_create.name,
            code=tenant_create.code,
            description=tenant_create.description,
            logo_url=tenant_create.logo_url,
            itinerary_limit=tenant_create.itinerary_limit or 100,
            ai_calls_limit=tenant_create.ai_calls_limit or 50,
            created_at=datetime.now(),
            is_active=True,
            itinerary_used=0,
            ai_calls_used=0,
            allowed_role_codes=tenant_create.allowed_role_codes
        )
        self.tenants.append(tenant)
        self.tenant_usage[self.next_id] = {
            'itinerary_used': 0,
            'ai_calls_used': 0
        }
        self.next_id += 1
        logger.info(f"[租户服务] 创建租户: {tenant.name} (代码: {tenant.code}, 允许角色: {tenant.allowed_role_codes})")
        return tenant

    def get_all_tenants(self) -> List[TenantResponse]:
        return [t for t in self.tenants if t.is_active]

    def get_tenant_by_id(self, tenant_id: int, include_inactive: bool = False) -> Optional[TenantResponse]:
        for tenant in self.tenants:
            if tenant.id == tenant_id:
                if not include_inactive and not tenant.is_active:
                    continue
                usage = self.tenant_usage.get(tenant_id, {'itinerary_used': 0, 'ai_calls_used': 0})
                tenant.itinerary_used = usage['itinerary_used']
                tenant.ai_calls_used = usage['ai_calls_used']
                return tenant
        return None

    def get_tenant_by_code(self, code: str) -> Optional[TenantResponse]:
        for tenant in self.tenants:
            if tenant.code == code and tenant.is_active:
                usage = self.tenant_usage.get(tenant.id, {'itinerary_used': 0, 'ai_calls_used': 0})
                tenant.itinerary_used = usage['itinerary_used']
                tenant.ai_calls_used = usage['ai_calls_used']
                return tenant
        return None

    def tenant_exists_by_code(self, code: str) -> bool:
        return self.get_tenant_by_code(code) is not None

    def update_tenant(self, tenant_id: int, tenant_update: TenantUpdate) -> Optional[TenantResponse]:
        tenant = self.get_tenant_by_id(tenant_id)
        if tenant is None:
            return None
        
        if tenant_update.name is not None:
            tenant.name = tenant_update.name
        if tenant_update.description is not None:
            tenant.description = tenant_update.description
        if tenant_update.logo_url is not None:
            tenant.logo_url = tenant_update.logo_url
        if tenant_update.is_active is not None:
            tenant.is_active = tenant_update.is_active
        if tenant_update.itinerary_limit is not None:
            tenant.itinerary_limit = tenant_update.itinerary_limit
        if tenant_update.ai_calls_limit is not None:
            tenant.ai_calls_limit = tenant_update.ai_calls_limit
        if tenant_update.allowed_role_codes is not None:
            tenant.allowed_role_codes = tenant_update.allowed_role_codes
        
        logger.info(f"[租户服务] 更新租户: {tenant.name} (ID: {tenant_id}, 允许角色: {tenant.allowed_role_codes})")
        return tenant

    def update_tenant_roles(self, tenant_id: int, role_codes: List[str]) -> Optional[TenantResponse]:
        logger.info(f"[租户角色授权] 开始更新租户角色授权: 租户ID={tenant_id}")
        
        tenant = self.get_tenant_by_id(tenant_id)
        if tenant is None:
            logger.error(f"[租户角色授权] 更新失败: 租户 ID '{tenant_id}' 不存在")
            return None
        
        logger.info(f"[租户角色授权] 找到租户: name='{tenant.name}', code='{tenant.code}'")
        
        old_roles = tenant.allowed_role_codes or []
        new_roles = role_codes
        
        logger.info(f"[租户角色授权] 当前允许的角色: {old_roles}")
        logger.info(f"[租户角色授权] 新允许的角色: {new_roles}")
        
        removed_roles = list(set(old_roles) - set(new_roles))
        added_roles = list(set(new_roles) - set(old_roles))
        
        if removed_roles:
            logger.warning(f"[租户角色授权] ⚠️ 即将移除的角色: {removed_roles}")
        if added_roles:
            logger.info(f"[租户角色授权] ➕ 即将添加的角色: {added_roles}")
        
        if len(new_roles) == 0:
            logger.warning(f"[租户角色授权] ⚠️ 允许的角色列表为空，租户成员将只能使用默认 USER 角色权限")
        else:
            logger.info(f"[租户角色授权] 租户将允许 {len(new_roles)} 个角色: {new_roles}")
        
        tenant.allowed_role_codes = new_roles
        
        logger.info(f"[租户角色授权] ✅ 角色授权更新成功")
        logger.info(f"[租户角色授权] 更新后允许的角色: {tenant.allowed_role_codes}")
        
        if old_roles != new_roles:
            logger.warning(f"[租户角色授权] ⚠️ 角色列表已变更，新登录用户将使用新的权限列表")
            if removed_roles:
                logger.warning(f"[租户角色授权] 已移除的角色: {removed_roles}")
            if added_roles:
                logger.warning(f"[租户角色授权] 已新增的角色: {added_roles}")
        
        logger.info(f"[租户服务] 更新租户角色: {tenant.name} (ID: {tenant_id}, 允许角色: {tenant.allowed_role_codes})")
        return tenant

    def deactivate_tenant(self, tenant_id: int) -> bool:
        tenant = self.get_tenant_by_id(tenant_id)
        if tenant is None:
            return False
        tenant.is_active = False
        logger.info(f"[租户服务] 停用租户: {tenant.name} (ID: {tenant_id})")
        return True

    def get_quota_usage(self, tenant_id: int) -> Optional[QuotaUsage]:
        tenant = self.get_tenant_by_id(tenant_id)
        if tenant is None:
            return None
        
        usage = self.tenant_usage.get(tenant_id, {'itinerary_used': 0, 'ai_calls_used': 0})
        
        return QuotaUsage(
            itinerary_used=usage['itinerary_used'],
            ai_calls_used=usage['ai_calls_used'],
            itinerary_limit=tenant.itinerary_limit or 100,
            ai_calls_limit=tenant.ai_calls_limit or 50,
            itinerary_remaining=max(0, (tenant.itinerary_limit or 100) - usage['itinerary_used']),
            ai_calls_remaining=max(0, (tenant.ai_calls_limit or 50) - usage['ai_calls_used'])
        )

    def increment_itinerary_usage(self, tenant_id: int) -> bool:
        tenant = self.get_tenant_by_id(tenant_id)
        if tenant is None:
            return False
        
        usage = self.tenant_usage.get(tenant_id, {'itinerary_used': 0, 'ai_calls_used': 0})
        
        if usage['itinerary_used'] >= (tenant.itinerary_limit or 100):
            logger.warning(f"[租户服务] 租户 {tenant.name} (ID: {tenant_id}) 行程数量已达上限")
            return False
        
        usage['itinerary_used'] += 1
        self.tenant_usage[tenant_id] = usage
        logger.info(f"[租户服务] 租户 {tenant.name} (ID: {tenant_id}) 行程使用量+1，当前: {usage['itinerary_used']}")
        return True

    def increment_ai_calls_usage(self, tenant_id: int) -> bool:
        tenant = self.get_tenant_by_id(tenant_id)
        if tenant is None:
            return False
        
        usage = self.tenant_usage.get(tenant_id, {'itinerary_used': 0, 'ai_calls_used': 0})
        
        if usage['ai_calls_used'] >= (tenant.ai_calls_limit or 50):
            logger.warning(f"[租户服务] 租户 {tenant.name} (ID: {tenant_id}) AI调用次数已达上限")
            return False
        
        usage['ai_calls_used'] += 1
        self.tenant_usage[tenant_id] = usage
        logger.info(f"[租户服务] 租户 {tenant.name} (ID: {tenant_id}) AI调用使用量+1，当前: {usage['ai_calls_used']}")
        return True

    def check_itinerary_quota(self, tenant_id: int) -> bool:
        tenant = self.get_tenant_by_id(tenant_id)
        if tenant is None:
            return False
        
        usage = self.tenant_usage.get(tenant_id, {'itinerary_used': 0, 'ai_calls_used': 0})
        return usage['itinerary_used'] < (tenant.itinerary_limit or 100)

    def check_ai_calls_quota(self, tenant_id: int) -> bool:
        tenant = self.get_tenant_by_id(tenant_id)
        if tenant is None:
            return False
        
        usage = self.tenant_usage.get(tenant_id, {'itinerary_used': 0, 'ai_calls_used': 0})
        return usage['ai_calls_used'] < (tenant.ai_calls_limit or 50)

    def get_tenant_with_quota(self, tenant_id: int) -> Optional[TenantWithQuota]:
        tenant = self.get_tenant_by_id(tenant_id)
        if tenant is None:
            return None
        
        usage = self.tenant_usage.get(tenant_id, {'itinerary_used': 0, 'ai_calls_used': 0})
        
        itinerary_limit = tenant.itinerary_limit or 100
        ai_calls_limit = tenant.ai_calls_limit or 50
        
        itinerary_percentage = (usage['itinerary_used'] / itinerary_limit * 100) if itinerary_limit > 0 else 0
        ai_calls_percentage = (usage['ai_calls_used'] / ai_calls_limit * 100) if ai_calls_limit > 0 else 0
        
        return TenantWithQuota(
            id=tenant.id,
            name=tenant.name,
            code=tenant.code,
            description=tenant.description,
            logo_url=tenant.logo_url,
            itinerary_limit=itinerary_limit,
            ai_calls_limit=ai_calls_limit,
            created_at=tenant.created_at,
            is_active=tenant.is_active,
            itinerary_used=usage['itinerary_used'],
            ai_calls_used=usage['ai_calls_used'],
            itinerary_remaining=max(0, itinerary_limit - usage['itinerary_used']),
            ai_calls_remaining=max(0, ai_calls_limit - usage['ai_calls_used']),
            itinerary_percentage=round(itinerary_percentage, 2),
            ai_calls_percentage=round(ai_calls_percentage, 2),
            allowed_role_codes=tenant.allowed_role_codes
        )

    def reset_usage(self, tenant_id: int) -> bool:
        tenant = self.get_tenant_by_id(tenant_id)
        if tenant is None:
            return False
        
        self.tenant_usage[tenant_id] = {
            'itinerary_used': 0,
            'ai_calls_used': 0
        }
        logger.info(f"[租户服务] 重置租户 {tenant.name} (ID: {tenant_id}) 的使用量")
        return True

    def clone_tenant(self, source_tenant_id: int, clone_request: TenantCloneRequest) -> Optional[TenantCloneResponse]:
        logger.info(f"[租户克隆服务] 开始克隆租户: 源租户ID={source_tenant_id}")
        logger.info(f"[租户克隆服务] 克隆配置: 名称={clone_request.name}, 代码={clone_request.code}")
        logger.info(f"[租户克隆服务] 克隆选项: 角色={clone_request.clone_roles}, 权限={clone_request.clone_permissions}, 配置={clone_request.clone_config}")
        
        source_tenant = self.get_tenant_by_id(source_tenant_id)
        if source_tenant is None:
            logger.error(f"[租户克隆服务] 克隆失败: 源租户 ID '{source_tenant_id}' 不存在")
            return None
        
        if self.tenant_exists_by_code(clone_request.code):
            logger.error(f"[租户克隆服务] 克隆失败: 租户代码 '{clone_request.code}' 已存在")
            return None
        
        new_tenant_data = TenantCreate(
            name=clone_request.name,
            code=clone_request.code,
            description=source_tenant.description,
            logo_url=source_tenant.logo_url,
        )
        
        if clone_request.clone_config:
            new_tenant_data.itinerary_limit = source_tenant.itinerary_limit
            new_tenant_data.ai_calls_limit = source_tenant.ai_calls_limit
            logger.info(f"[租户克隆服务] 克隆配置: 行程上限={source_tenant.itinerary_limit}, AI调用上限={source_tenant.ai_calls_limit}")
        
        cloned_roles_count = 0
        cloned_permissions_count = 0
        
        if clone_request.clone_roles:
            new_tenant_data.allowed_role_codes = source_tenant.allowed_role_codes.copy() if source_tenant.allowed_role_codes else []
            cloned_roles_count = len(new_tenant_data.allowed_role_codes)
            logger.info(f"[租户克隆服务] 克隆角色: {new_tenant_data.allowed_role_codes} (共 {cloned_roles_count} 个)")
        
        if clone_request.clone_permissions:
            cloned_permissions_count = self._count_permissions_for_roles(source_tenant.allowed_role_codes)
            logger.info(f"[租户克隆服务] 克隆权限: 共 {cloned_permissions_count} 个权限（通过角色关联）")
        
        new_tenant = self.create_tenant(new_tenant_data)
        
        logger.info(f"[租户克隆服务] 租户克隆成功: 新租户ID={new_tenant.id}, 名称={new_tenant.name}")
        
        return TenantCloneResponse(
            id=new_tenant.id,
            name=new_tenant.name,
            code=new_tenant.code,
            cloned_roles_count=cloned_roles_count,
            cloned_permissions_count=cloned_permissions_count,
            message=f"租户克隆成功！已克隆 {cloned_roles_count} 个角色，{cloned_permissions_count} 个权限。"
        )
    
    def _count_permissions_for_roles(self, role_codes: Optional[List[str]]) -> int:
        from app.services.role_service import role_service
        
        if not role_codes:
            return 0
        
        total_permissions = 0
        for role_code in role_codes:
            role = role_service.get_role_by_code(role_code)
            if role:
                total_permissions += len(role.permissions)
        
        return total_permissions

    def initialize_default_tenants(self):
        default_tenants = [
            TenantCreate(
                name="系统默认租户",
                code="SYSTEM",
                description="系统默认租户，用于初始化",
                logo_url=None,
                itinerary_limit=1000,
                ai_calls_limit=500,
                allowed_role_codes=["ADMIN", "USER"]
            ),
            TenantCreate(
                name="租户A",
                code="TENANT_A",
                description="示例租户A",
                logo_url=None,
                itinerary_limit=100,
                ai_calls_limit=50,
                allowed_role_codes=["ADMIN", "USER"]
            ),
            TenantCreate(
                name="租户B",
                code="TENANT_B",
                description="示例租户B",
                logo_url=None,
                itinerary_limit=200,
                ai_calls_limit=100,
                allowed_role_codes=["USER"]
            )
        ]
        
        for tenant_create in default_tenants:
            if not self.tenant_exists_by_code(tenant_create.code):
                created_tenant = self.create_tenant(tenant_create)
                logger.info(f"[租户初始化] 创建默认租户: {created_tenant.name} (代码: {created_tenant.code}, 允许角色: {created_tenant.allowed_role_codes})")
            else:
                logger.info(f"[租户初始化] 默认租户已存在: {tenant_create.code}")


tenant_service = TenantService()
