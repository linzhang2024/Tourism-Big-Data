from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class UserBase(BaseModel):
    username: str = Field(..., description="用户名，用于登录")
    email: Optional[str] = Field(None, description="用户邮箱")
    role_code: str = Field(default="USER", description="用户角色代码，如：ADMIN、USER")
    tenant_id: Optional[int] = Field(None, description="所属租户ID")


class UserCreate(UserBase):
    password: str = Field(..., description="用户密码，创建时使用明文，存储时会加密")


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="用户唯一 ID")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: Optional[datetime] = Field(None, description="更新时间")
    permissions: List[str] = Field(default=[], description="用户拥有的权限列表")


class UserInDB(UserResponse):
    hashed_password: str = Field(..., description="加密后的用户密码")


class LoginRequest(BaseModel):
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class LoginResponse(BaseModel):
    access_token: str = Field(..., description="JWT 访问令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
    user: UserResponse = Field(..., description="用户信息")
