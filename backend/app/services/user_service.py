import logging
from typing import List, Optional
from datetime import datetime
from passlib.context import CryptContext

from app.models.user import UserCreate, UserResponse, UserInDB

logger = logging.getLogger(__name__)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class UserService:
    def __init__(self):
        self.users: List[UserInDB] = []
        self.next_id: int = 1

    def get_password_hash(self, password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    def create_user(self, user_create: UserCreate) -> UserResponse:
        hashed_password = self.get_password_hash(user_create.password)
        
        user_in_db = UserInDB(
            id=self.next_id,
            username=user_create.username,
            email=user_create.email,
            role_code=user_create.role_code,
            hashed_password=hashed_password,
            created_at=datetime.now(),
            updated_at=None
        )
        
        self.users.append(user_in_db)
        self.next_id += 1
        
        logger.info(f"[用户服务] 创建用户: {user_in_db.username} (角色: {user_in_db.role_code})")
        
        return UserResponse(
            id=user_in_db.id,
            username=user_in_db.username,
            email=user_in_db.email,
            role_code=user_in_db.role_code,
            created_at=user_in_db.created_at,
            updated_at=user_in_db.updated_at
        )

    def get_user_by_id(self, user_id: int) -> Optional[UserInDB]:
        for user in self.users:
            if user.id == user_id:
                return user
        return None

    def get_user_by_username(self, username: str) -> Optional[UserInDB]:
        for user in self.users:
            if user.username == username:
                return user
        return None

    def get_all_users(self) -> List[UserResponse]:
        return [
            UserResponse(
                id=user.id,
                username=user.username,
                email=user.email,
                role_code=user.role_code,
                created_at=user.created_at,
                updated_at=user.updated_at
            )
            for user in self.users
        ]

    def authenticate_user(self, username: str, password: str) -> Optional[UserResponse]:
        user = self.get_user_by_username(username)
        
        if not user:
            logger.warning(f"[用户服务] 登录失败: 用户名 '{username}' 不存在")
            return None
        
        if not self.verify_password(password, user.hashed_password):
            logger.warning(f"[用户服务] 登录失败: 用户 '{username}' 密码错误")
            return None
        
        logger.info(f"[用户服务] 用户 '{username}' 认证成功，角色: {user.role_code}")
        
        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            role_code=user.role_code,
            created_at=user.created_at,
            updated_at=user.updated_at
        )

    def initialize_default_users(self):
        default_users = [
            UserCreate(
                username="admin",
                password="admin123",
                email="admin@tourism.com",
                role_code="ADMIN"
            ),
            UserCreate(
                username="user",
                password="user123",
                email="user@tourism.com",
                role_code="USER"
            )
        ]
        
        for user_create in default_users:
            if not self.get_user_by_username(user_create.username):
                created_user = self.create_user(user_create)
                logger.info(f"[用户初始化] 创建默认用户: {created_user.username} (角色: {created_user.role_code})")
            else:
                logger.info(f"[用户初始化] 默认用户已存在: {user_create.username}")


user_service = UserService()
