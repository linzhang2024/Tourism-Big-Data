import logging
from fastapi import APIRouter, HTTPException
from typing import List
from pydantic import BaseModel

from app.models.role import RoleCreate, RoleResponse
from app.services.role_service import role_service
from app.services.permission_service import permission_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=List[RoleResponse])
async def get_roles():
    logger.info("[角色API] 获取角色列表")
    roles = role_service.get_all_roles()
    logger.info(f"[角色API] 获取到 {len(roles)} 个角色")
    return roles


@router.post("/", response_model=RoleResponse, status_code=201)
async def create_role(role: RoleCreate):
    logger.info(f"[角色API] 创建角色请求: code={role.code}, name={role.name}")
    
    if role_service.role_exists_by_code(role.code):
        logger.warning(f"[角色API] 创建角色失败: 角色代码 '{role.code}' 已存在")
        raise HTTPException(
            status_code=400,
            detail=f"角色代码 '{role.code}' 已存在"
        )
    
    created_role = role_service.create_role(role)
    logger.info(f"[角色API] 角色创建成功: ID={created_role.id}, code={created_role.code}")
    return created_role


class RolePermissionsUpdate(BaseModel):
    permission_codes: List[str]


@router.put("/{role_id}/permissions", response_model=RoleResponse)
async def update_role_permissions(role_id: int, permissions_update: RolePermissionsUpdate):
    logger.info(f"[角色权限配置] 收到角色权限更新请求: role_id={role_id}, 权限数量={len(permissions_update.permission_codes)}")
    logger.info(f"[角色权限配置] 请求的权限代码: {permissions_update.permission_codes}")
    
    role = role_service.get_role_by_id(role_id)
    if role is None:
        logger.error(f"[角色权限配置] 更新失败: 角色 ID '{role_id}' 不存在")
        raise HTTPException(
            status_code=404,
            detail=f"角色 ID '{role_id}' 不存在"
        )
    
    logger.info(f"[角色权限配置] 找到角色: name='{role.name}', code='{role.code}'")
    logger.info(f"[角色权限配置] 角色当前权限: {[p.code for p in role.permissions]}")
    
    permissions_to_set = []
    for code in permissions_update.permission_codes:
        permission = permission_service.get_permission_by_code(code)
        if permission is None:
            logger.error(f"[角色权限配置] 更新失败: 权限代码 '{code}' 不存在")
            raise HTTPException(
                status_code=400,
                detail=f"权限代码 '{code}' 不存在"
            )
        permissions_to_set.append(permission)
    
    logger.info(f"[角色权限配置] 验证通过，准备更新权限")
    logger.info(f"[角色权限配置] 待设置权限: {[p.code for p in permissions_to_set]}")
    logger.info(f"[角色权限配置] 权限分类: {[(p.name, p.category) for p in permissions_to_set]}")
    
    success = role_service.set_role_permissions(role.code, permissions_to_set)
    if not success:
        logger.error(f"[角色权限配置] 更新失败: 角色服务 set_role_permissions 返回失败")
        raise HTTPException(
            status_code=500,
            detail="更新角色权限失败"
        )
    
    updated_role = role_service.get_role_by_id(role_id)
    logger.info(f"[角色权限配置] ✅ 角色权限更新成功")
    logger.info(f"[角色权限配置] 更新后权限: {[p.code for p in updated_role.permissions]}")
    logger.info(f"[角色权限配置] 权限数量变化: {len(role.permissions)} -> {len(updated_role.permissions)}")
    
    return updated_role
