from typing import List, Optional
from datetime import datetime
from app.models.permission import PermissionCreate, PermissionResponse


class PermissionService:
    def __init__(self):
        self.permissions: List[PermissionResponse] = []
        self.next_id: int = 1

    def create_permission(self, permission_create: PermissionCreate) -> PermissionResponse:
        permission = PermissionResponse(
            id=self.next_id,
            name=permission_create.name,
            code=permission_create.code,
            description=permission_create.description,
            created_at=datetime.now()
        )
        self.permissions.append(permission)
        self.next_id += 1
        return permission

    def get_all_permissions(self) -> List[PermissionResponse]:
        return self.permissions

    def get_permission_by_code(self, code: str) -> Optional[PermissionResponse]:
        for permission in self.permissions:
            if permission.code == code:
                return permission
        return None

    def permission_exists_by_code(self, code: str) -> bool:
        return self.get_permission_by_code(code) is not None


permission_service = PermissionService()