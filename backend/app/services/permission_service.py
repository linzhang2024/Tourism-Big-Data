from typing import List, Optional
from datetime import datetime
from app.models.permission import PermissionCreate, PermissionResponse, PermissionType


class PermissionService:
    def __init__(self):
        self.permissions: List[PermissionResponse] = []
        self.next_id: int = 1

    def create_permission(self, permission_create: PermissionCreate) -> PermissionResponse:
        permission = PermissionResponse(
            id=self.next_id,
            name=permission_create.name,
            code=permission_create.code,
            permission_type=permission_create.permission_type,
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

    def get_permissions_by_type(self, permission_type: str) -> List[PermissionResponse]:
        return [p for p in self.permissions if p.permission_type == permission_type]

    def get_menu_permissions(self) -> List[PermissionResponse]:
        return self.get_permissions_by_type(PermissionType.MENU)

    def get_data_permissions(self) -> List[PermissionResponse]:
        return self.get_permissions_by_type(PermissionType.DATA)


permission_service = PermissionService()