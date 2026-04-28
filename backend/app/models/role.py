from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.permission import PermissionResponse


class RoleBase(BaseModel):
    name: str = Field(..., description="角色名称，如：管理员")
    code: str = Field(..., description="角色代码标识，如：ADMIN")
    description: Optional[str] = Field(None, description="角色详细描述")


class RoleCreate(RoleBase):
    pass


class RoleResponse(RoleBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="角色唯一 ID")
    created_at: datetime = Field(..., description="创建时间")
    permissions: List[PermissionResponse] = Field(default_factory=list, description="角色拥有的权限列表")
