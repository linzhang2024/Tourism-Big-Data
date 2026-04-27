from fastapi import APIRouter, HTTPException
from typing import List

from app.models.role import RoleCreate, RoleResponse
from app.services.role_service import role_service

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
