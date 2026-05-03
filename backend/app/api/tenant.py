import logging
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any

from app.models.tenant import (
    TenantCreate, 
    TenantResponse, 
    TenantUpdate, 
    TenantWithQuota,
    QuotaUsage,
    TenantRolesUpdate,
    TenantCloneRequest,
    TenantCloneResponse
)
from app.models.exceptions import BusinessException, ErrorCode
from app.services.tenant_service import tenant_service
from app.services.user_service import user_service
from app.services.audit_log_service import audit_log_service
from app.models.audit_log import OperationType, OperationStatus

logger = logging.getLogger(__name__)
router = APIRouter()

OPERATOR_NAME = "系统管理员"


def get_update_changes(old_tenant: TenantResponse, update: TenantUpdate) -> Dict[str, Any]:
    changes = {}
    if update.name is not None and update.name != old_tenant.name:
        changes["name"] = {"old": old_tenant.name, "new": update.name}
    if update.description is not None and update.description != old_tenant.description:
        changes["description"] = {"old": old_tenant.description, "new": update.description}
    if update.itinerary_limit is not None and update.itinerary_limit != old_tenant.itinerary_limit:
        changes["itinerary_limit"] = {"old": old_tenant.itinerary_limit, "new": update.itinerary_limit}
    if update.ai_calls_limit is not None and update.ai_calls_limit != old_tenant.ai_calls_limit:
        changes["ai_calls_limit"] = {"old": old_tenant.ai_calls_limit, "new": update.ai_calls_limit}
    return changes


@router.get("/", response_model=List[TenantResponse])
async def get_tenants():
    logger.info("[租户API] 获取租户列表")
    return tenant_service.get_all_tenants()


@router.get("/{tenant_id}", response_model=TenantWithQuota)
async def get_tenant(tenant_id: int):
    logger.info(f"[租户API] 获取租户详情: ID={tenant_id}")
    tenant = tenant_service.get_tenant_with_quota(tenant_id)
    if tenant is None:
        raise HTTPException(
            status_code=404,
            detail=f"租户 ID '{tenant_id}' 不存在"
        )
    return tenant


@router.get("/code/{code}", response_model=TenantWithQuota)
async def get_tenant_by_code(code: str):
    logger.info(f"[租户API] 通过代码获取租户详情: code={code}")
    tenant = tenant_service.get_tenant_by_code(code)
    if tenant is None:
        raise HTTPException(
            status_code=404,
            detail=f"租户代码 '{code}' 不存在"
        )
    return tenant_service.get_tenant_with_quota(tenant.id)


@router.post("/", response_model=TenantResponse, status_code=201)
async def create_tenant(tenant: TenantCreate):
    logger.info(f"[租户API] 创建租户: code={tenant.code}")
    if tenant_service.tenant_exists_by_code(tenant.code):
        audit_log_service.log_operation(
            operation_type=OperationType.TENANT_CREATE,
            operator_name=OPERATOR_NAME,
            target_type="TENANT",
            target_name=f"{tenant.name} ({tenant.code})",
            status=OperationStatus.FAILED,
            error_message=f"租户代码 '{tenant.code}' 已存在"
        )
        raise HTTPException(
            status_code=400,
            detail=f"租户代码 '{tenant.code}' 已存在"
        )
    created_tenant = tenant_service.create_tenant(tenant)
    logger.info(f"[租户API] 租户创建成功: ID={created_tenant.id}")
    
    audit_log_service.log_tenant_create(
        tenant_id=created_tenant.id,
        tenant_name=created_tenant.name,
        tenant_code=created_tenant.code,
        operator_name=OPERATOR_NAME
    )
    
    return created_tenant


@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(tenant_id: int, tenant_update: TenantUpdate):
    logger.info(f"[租户API] 收到更新租户请求: ID={tenant_id}")
    
    tenant = tenant_service.get_tenant_by_id(tenant_id)
    if tenant is None:
        logger.error(f"[租户API] 更新租户失败: 租户 ID '{tenant_id}' 不存在")
        raise HTTPException(
            status_code=404,
            detail=f"租户 ID '{tenant_id}' 不存在"
        )
    
    logger.info(f"[租户API] 找到租户: name='{tenant.name}', code='{tenant.code}'")
    old_status = tenant.is_active
    old_name = tenant.name
    
    if tenant_update.allowed_role_codes is not None:
        logger.info(f"[租户角色授权] ⚠️ 检测到角色授权变更请求")
        logger.info(f"[租户角色授权] 租户当前允许的角色: {tenant.allowed_role_codes}")
        logger.info(f"[租户角色授权] 租户新允许的角色: {tenant_update.allowed_role_codes}")
        
        if len(tenant_update.allowed_role_codes) == 0:
            logger.warning(f"[租户角色授权] ⚠️ 允许的角色列表为空，租户成员将只能使用默认 USER 角色权限")
        else:
            logger.info(f"[租户角色授权] 租户将允许 {len(tenant_update.allowed_role_codes)} 个角色: {tenant_update.allowed_role_codes}")
    
    updated_tenant = tenant_service.update_tenant(tenant_id, tenant_update)
    if updated_tenant is None:
        audit_log_service.log_operation(
            operation_type=OperationType.TENANT_UPDATE,
            operator_name=OPERATOR_NAME,
            target_type="TENANT",
            target_id=tenant_id,
            target_name=tenant.name,
            status=OperationStatus.FAILED,
            error_message="更新租户失败"
        )
        logger.error(f"[租户API] 更新租户失败: tenant_service.update_tenant 返回 None")
        raise HTTPException(
            status_code=500,
            detail="更新租户失败"
        )
    
    logger.info(f"[租户API] ✅ 租户更新成功: ID={tenant_id}")
    
    changes = get_update_changes(tenant, tenant_update)
    if tenant_update.is_active is not None and old_status != tenant_update.is_active:
        if tenant_update.is_active:
            audit_log_service.log_tenant_enable(
                tenant_id=tenant_id,
                tenant_name=updated_tenant.name,
                operator_name=OPERATOR_NAME
            )
        else:
            audit_log_service.log_tenant_disable(
                tenant_id=tenant_id,
                tenant_name=old_name,
                operator_name=OPERATOR_NAME
            )
    elif changes:
        audit_log_service.log_tenant_update(
            tenant_id=tenant_id,
            tenant_name=updated_tenant.name,
            changes=changes,
            operator_name=OPERATOR_NAME
        )
    
    if tenant_update.allowed_role_codes is not None:
        logger.info(f"[租户角色授权] ✅ 角色授权更新成功")
        logger.info(f"[租户角色授权] 更新后允许的角色: {updated_tenant.allowed_role_codes}")
        
        if tenant.allowed_role_codes != updated_tenant.allowed_role_codes:
            logger.warning(f"[租户角色授权] ⚠️ 角色列表已变更，新登录用户将使用新的权限列表")
            logger.warning(f"[租户角色授权] 移除的角色: {list(set(tenant.allowed_role_codes) - set(updated_tenant.allowed_role_codes))}")
            logger.warning(f"[租户角色授权] 新增的角色: {list(set(updated_tenant.allowed_role_codes) - set(tenant.allowed_role_codes))}")
    
    return updated_tenant


@router.put("/{tenant_id}/roles", response_model=TenantResponse)
async def update_tenant_roles(tenant_id: int, roles_update: TenantRolesUpdate):
    logger.info("=" * 60)
    logger.info(f"[租户角色授权API] 收到角色授权保存请求: 租户ID={tenant_id}")
    logger.info(f"[租户角色授权API] 请求体: role_codes={roles_update.role_codes}")
    logger.info("=" * 60)
    
    tenant = tenant_service.get_tenant_by_id(tenant_id)
    if tenant is None:
        logger.error(f"[租户角色授权API] 更新失败: 租户 ID '{tenant_id}' 不存在")
        raise HTTPException(
            status_code=404,
            detail=f"租户 ID '{tenant_id}' 不存在"
        )
    
    logger.info(f"[租户角色授权API] 找到租户: name='{tenant.name}', code='{tenant.code}'")
    old_roles = tenant.allowed_role_codes or []
    
    updated_tenant = tenant_service.update_tenant_roles(tenant_id, roles_update.role_codes)
    if updated_tenant is None:
        audit_log_service.log_operation(
            operation_type=OperationType.TENANT_ROLE_UPDATE,
            operator_name=OPERATOR_NAME,
            target_type="TENANT",
            target_id=tenant_id,
            target_name=tenant.name,
            status=OperationStatus.FAILED,
            error_message="更新租户角色授权失败"
        )
        logger.error(f"[租户角色授权API] 更新失败: tenant_service.update_tenant_roles 返回 None")
        raise HTTPException(
            status_code=500,
            detail="更新租户角色授权失败"
        )
    
    audit_log_service.log_tenant_role_update(
        tenant_id=tenant_id,
        tenant_name=updated_tenant.name,
        old_roles=old_roles,
        new_roles=roles_update.role_codes,
        operator_name=OPERATOR_NAME
    )
    
    logger.info("=" * 60)
    logger.info(f"[租户角色授权API] ✅ 角色授权保存成功: 租户ID={tenant_id}")
    logger.info(f"[租户角色授权API] 最终允许的角色: {updated_tenant.allowed_role_codes}")
    logger.info("=" * 60)
    
    return updated_tenant


@router.delete("/{tenant_id}", status_code=204)
async def delete_tenant(tenant_id: int):
    logger.info(f"[租户API] 删除租户: ID={tenant_id}")
    tenant = tenant_service.get_tenant_by_id(tenant_id)
    if tenant is None:
        raise HTTPException(
            status_code=404,
            detail=f"租户 ID '{tenant_id}' 不存在"
        )
    
    success = tenant_service.deactivate_tenant(tenant_id)
    if not success:
        audit_log_service.log_operation(
            operation_type=OperationType.TENANT_DELETE,
            operator_name=OPERATOR_NAME,
            target_type="TENANT",
            target_id=tenant_id,
            target_name=tenant.name,
            status=OperationStatus.FAILED,
            error_message="删除租户失败"
        )
        raise HTTPException(
            status_code=500,
            detail="删除租户失败"
        )
    
    audit_log_service.log_tenant_delete(
        tenant_id=tenant_id,
        tenant_name=tenant.name,
        operator_name=OPERATOR_NAME
    )
    
    logger.info(f"[租户API] 租户删除成功: ID={tenant_id}")


@router.get("/{tenant_id}/quota", response_model=QuotaUsage)
async def get_quota_usage(tenant_id: int):
    logger.info(f"[租户API] 获取租户配额使用情况: ID={tenant_id}")
    quota_usage = tenant_service.get_quota_usage(tenant_id)
    if quota_usage is None:
        raise HTTPException(
            status_code=404,
            detail=f"租户 ID '{tenant_id}' 不存在"
        )
    return quota_usage


@router.post("/{tenant_id}/quota/reset", response_model=QuotaUsage)
async def reset_quota_usage(tenant_id: int):
    logger.info(f"[租户API] 重置租户配额使用情况: ID={tenant_id}")
    tenant = tenant_service.get_tenant_by_id(tenant_id)
    if tenant is None:
        raise HTTPException(
            status_code=404,
            detail=f"租户 ID '{tenant_id}' 不存在"
        )
    
    success = tenant_service.reset_usage(tenant_id)
    if not success:
        audit_log_service.log_operation(
            operation_type=OperationType.QUOTA_RESET,
            operator_name=OPERATOR_NAME,
            target_type="TENANT",
            target_id=tenant_id,
            target_name=tenant.name,
            status=OperationStatus.FAILED,
            error_message="重置配额使用情况失败"
        )
        raise HTTPException(
            status_code=500,
            detail="重置配额使用情况失败"
        )
    
    audit_log_service.log_quota_reset(
        tenant_id=tenant_id,
        tenant_name=tenant.name,
        operator_name=OPERATOR_NAME
    )
    
    return tenant_service.get_quota_usage(tenant_id)


@router.get("/my/quota", response_model=QuotaUsage)
async def get_my_quota():
    logger.info("[租户API] 获取当前用户所属租户的配额使用情况")
    current_tenant_id = 1
    
    quota_usage = tenant_service.get_quota_usage(current_tenant_id)
    if quota_usage is None:
        raise HTTPException(
            status_code=404,
            detail=f"租户 ID '{current_tenant_id}' 不存在"
        )
    return quota_usage


@router.get("/my/info", response_model=TenantWithQuota)
async def get_my_tenant_info():
    logger.info("[租户API] 获取当前用户所属租户的详细信息")
    current_tenant_id = 1
    
    tenant = tenant_service.get_tenant_with_quota(current_tenant_id)
    if tenant is None:
        raise HTTPException(
            status_code=404,
            detail=f"租户 ID '{current_tenant_id}' 不存在"
        )
    return tenant


@router.put("/{tenant_id}/quota", response_model=TenantResponse)
async def update_quota(
    tenant_id: int,
    itinerary_limit: Optional[int] = Query(None, description="行程数量上限"),
    ai_calls_limit: Optional[int] = Query(None, description="AI调用次数上限")
):
    logger.info(f"[租户API] 更新租户配额: ID={tenant_id}")
    tenant = tenant_service.get_tenant_by_id(tenant_id)
    if tenant is None:
        raise HTTPException(
            status_code=404,
            detail=f"租户 ID '{tenant_id}' 不存在"
        )
    
    tenant_update = TenantUpdate(
        itinerary_limit=itinerary_limit,
        ai_calls_limit=ai_calls_limit
    )
    
    updated_tenant = tenant_service.update_tenant(tenant_id, tenant_update)
    if updated_tenant is None:
        raise HTTPException(
            status_code=500,
            detail="更新配额失败"
        )
    
    logger.info(f"[租户API] 租户配额更新成功: ID={tenant_id}")
    return updated_tenant


@router.post("/{tenant_id}/clone", response_model=TenantCloneResponse, status_code=201)
async def clone_tenant(tenant_id: int, clone_request: TenantCloneRequest):
    logger.info("=" * 60)
    logger.info(f"[租户克隆API] 收到克隆租户请求: 源租户ID={tenant_id}")
    logger.info(f"[租户克隆API] 新租户配置: 名称={clone_request.name}, 代码={clone_request.code}")
    logger.info(f"[租户克隆API] 克隆选项: 角色={clone_request.clone_roles}, 权限={clone_request.clone_permissions}, 配置={clone_request.clone_config}")
    logger.info("=" * 60)
    
    source_tenant = tenant_service.get_tenant_by_id(tenant_id, include_inactive=True)
    if source_tenant is None:
        logger.error(f"[租户克隆API] 克隆失败: 源租户 ID '{tenant_id}' 不存在")
        raise BusinessException(
            code=ErrorCode.TENANT_NOT_FOUND,
            tenant_id=tenant_id
        )
    
    logger.info(f"[租户克隆API] 找到源租户: name='{source_tenant.name}', code='{source_tenant.code}'")
    
    if not source_tenant.is_active:
        logger.error(f"[租户克隆API] 克隆失败: 源租户 '{source_tenant.name}' 已被禁用")
        raise BusinessException(
            code=ErrorCode.TENANT_DISABLED,
            tenant_name=source_tenant.name
        )
    
    if tenant_service.tenant_exists_by_code(clone_request.code):
        audit_log_service.log_operation(
            operation_type=OperationType.TENANT_CLONE,
            operator_name=OPERATOR_NAME,
            target_type="TENANT",
            target_name=f"{clone_request.name} ({clone_request.code})",
            status=OperationStatus.FAILED,
            error_message=f"租户代码 '{clone_request.code}' 已存在",
            details={"source_tenant_id": tenant_id, "source_tenant_name": source_tenant.name}
        )
        logger.error(f"[租户克隆API] 克隆失败: 租户代码 '{clone_request.code}' 已存在")
        raise BusinessException(
            code=ErrorCode.TENANT_CODE_EXISTS,
            tenant_code=clone_request.code
        )
    
    cloned_tenant = tenant_service.clone_tenant(tenant_id, clone_request)
    if cloned_tenant is None:
        audit_log_service.log_operation(
            operation_type=OperationType.TENANT_CLONE,
            operator_name=OPERATOR_NAME,
            target_type="TENANT",
            target_name=f"{clone_request.name} ({clone_request.code})",
            status=OperationStatus.FAILED,
            error_message="克隆租户失败",
            details={"source_tenant_id": tenant_id, "source_tenant_name": source_tenant.name}
        )
        logger.error(f"[租户克隆API] 克隆失败: tenant_service.clone_tenant 返回 None")
        raise BusinessException(
            code=ErrorCode.INTERNAL_ERROR
        )
    
    audit_log_service.log_tenant_clone(
        source_tenant_id=tenant_id,
        source_tenant_name=source_tenant.name,
        new_tenant_id=cloned_tenant.id,
        new_tenant_name=cloned_tenant.name,
        new_tenant_code=cloned_tenant.code,
        cloned_roles_count=cloned_tenant.cloned_roles_count,
        cloned_permissions_count=cloned_tenant.cloned_permissions_count,
        operator_name=OPERATOR_NAME
    )
    
    logger.info("=" * 60)
    logger.info(f"[租户克隆API] ✅ 租户克隆成功")
    logger.info(f"[租户克隆API] 新租户: ID={cloned_tenant.id}, 名称={cloned_tenant.name}, 代码={cloned_tenant.code}")
    logger.info(f"[租户克隆API] 克隆统计: 角色={cloned_tenant.cloned_roles_count}个, 权限={cloned_tenant.cloned_permissions_count}个")
    logger.info("=" * 60)
    
    return cloned_tenant
