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
    return role_service.get_all_roles()


@router.post("/", response_model=RoleResponse, status_code=201)
async def create_role(role: RoleCreate):
    if role_service.role_exists_by_code(role.code):
        raise HTTPException(
            status_code=400,
            detail=f"角色代码 '{role.code}' 已存在"
        )
    return role_service.create_role(role)


class RolePermissionsUpdate(BaseModel):
    permission_codes: List[str]


@router.put("/{role_id}/permissions", response_model=RoleResponse)
async def update_role_permissions(role_id: int, permissions_update: RolePermissionsUpdate):
    role = role_service.get_role_by_id(role_id)
    if role is None:
        raise HTTPException(
            status_code=404,
            detail=f"角色 ID '{role_id}' 不存在"
        )
    
    permissions_to_set = []
    for code in permissions_update.permission_codes:
        permission = permission_service.get_permission_by_code(code)
        if permission is None:
            raise HTTPException(
                status_code=400,
                detail=f"权限代码 '{code}' 不存在"
            )
        permissions_to_set.append(permission)
    
    logger.info(f"[权限更新] 准备更新角色 '{role.name}' ({role.code}) 的权限")
    logger.info(f"[权限更新] 当前权限: {[p.code for p in role.permissions]}")
    logger.info(f"[权限更新] 目标权限: {[p.code for p in permissions_to_set]}")
    
    success = role_service.set_role_permissions(role.code, permissions_to_set)
    if not success:
        raise HTTPException(
            status_code=500,
            detail="更新角色权限失败"
        )
    
    updated_role = role_service.get_role_by_id(role_id)
    logger.info(f"[权限更新] 角色 '{role.name}' ({role.code}) 权限更新成功")
    logger.info(f"[权限更新] 更新后权限: {[p.code for p in updated_role.permissions]}")
    
    return updated_role
