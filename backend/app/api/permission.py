from fastapi import APIRouter
from typing import List

from app.models.permission import PermissionResponse
from app.services.permission_service import permission_service

router = APIRouter()


@router.get("/", response_model=List[PermissionResponse])
async def get_permissions():
    return permission_service.get_all_permissions()