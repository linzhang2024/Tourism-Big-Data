from typing import List, Optional
from datetime import datetime
from app.models.role import RoleCreate, RoleResponse


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
            created_at=datetime.now()
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


role_service = RoleService()
