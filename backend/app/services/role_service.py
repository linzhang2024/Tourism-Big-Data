from typing import List, Optional
from datetime import datetime
from app.models.role import RoleCreate, RoleResponse
from app.models.permission import PermissionResponse


class RoleService:
    def __init__(self):
        self.roles: List[RoleResponse] = []
        self.next_id: int = 1

    def create_role(self, role_create: RoleCreate) -> RoleResponse:
        role = RoleResponse(
            id=self.next_id,
            name=role_create.name,
            code=role_create.code,
            description=role_create.description,
            created_at=datetime.now(),
            permissions=[]
        )
        self.roles.append(role)
        self.next_id += 1
        return role

    def get_all_roles(self) -> List[RoleResponse]:
        return self.roles

    def get_role_by_code(self, code: str) -> Optional[RoleResponse]:
        for role in self.roles:
            if role.code == code:
                return role
        return None

    def role_exists_by_code(self, code: str) -> bool:
        return self.get_role_by_code(code) is not None

    def add_permission_to_role(self, role_code: str, permission: PermissionResponse) -> bool:
        role = self.get_role_by_code(role_code)
        if role is None:
            return False
        for existing_perm in role.permissions:
            if existing_perm.code == permission.code:
                return False
        role.permissions.append(permission)
        return True

    def add_permissions_to_role(self, role_code: str, permissions: List[PermissionResponse]) -> int:
        count = 0
        for permission in permissions:
            if self.add_permission_to_role(role_code, permission):
                count += 1
        return count


role_service = RoleService()
