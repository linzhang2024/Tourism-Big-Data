import logging
from typing import List, Optional
from datetime import datetime
import bcrypt

from app.models.user import UserCreate, UserResponse, UserInDB, UserStatus
from app.utils.tenant_context import tenant_context
from app.services.tenant_service import tenant_service
from app.services.role_service import role_service

logger = logging.getLogger(__name__)


class UserService:
    def __init__(self):
        self.users: List[UserInDB] = []
        self.next_id: int = 1

    def get_password_hash(self, password: str) -> str:
        password_bytes = password.encode('utf-8')
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)

    def create_user(self, user_create: UserCreate) -> UserResponse:
        hashed_password = self.get_password_hash(user_create.password)
        
        user_in_db = UserInDB(
            id=self.next_id,
            username=user_create.username,
            email=user_create.email,
            role_code=user_create.role_code,
            tenant_id=user_create.tenant_id,
            status=user_create.status,
            hashed_password=hashed_password,
            created_at=datetime.now(),
            updated_at=None
        )
        
        self.users.append(user_in_db)
        self.next_id += 1
        
        logger.info(f"[用户服务] 创建用户: {user_in_db.username} (角色: {user_in_db.role_code}, 租户ID: {user_in_db.tenant_id}, 状态: {user_in_db.status})")
        
        return self._to_response(user_in_db)

    def _to_response(self, user_in_db: UserInDB) -> UserResponse:
        return UserResponse(
            id=user_in_db.id,
            username=user_in_db.username,
            email=user_in_db.email,
            role_code=user_in_db.role_code,
            tenant_id=user_in_db.tenant_id,
            status=user_in_db.status,
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
        return [self._to_response(user) for user in self.users]

    def get_users_by_tenant(self, tenant_id: int) -> List[UserResponse]:
        logger.info(f"[用户服务] 获取租户 {tenant_id} 的所有用户")
        return [
            self._to_response(user) 
            for user in self.users 
            if user.tenant_id == tenant_id
        ]

    def authenticate_user(self, username: str, password: str) -> Optional[UserResponse]:
        user = self.get_user_by_username(username)
        
        if not user:
            logger.warning(f"[用户服务] 登录失败: 用户名 '{username}' 不存在")
            return None
        
        if not self.verify_password(password, user.hashed_password):
            logger.warning(f"[用户服务] 登录失败: 用户 '{username}' 密码错误")
            return None
        
        if user.status == UserStatus.PENDING:
            logger.warning(f"[用户服务] 登录失败: 用户 '{username}' 状态为待审核")
            return None
        
        if user.status == UserStatus.REJECTED:
            logger.warning(f"[用户服务] 登录失败: 用户 '{username}' 状态为已拒绝")
            return None
        
        logger.info(f"[用户服务] 用户 '{username}' 认证成功，角色: {user.role_code}, 租户ID: {user.tenant_id}")
        
        return self._to_response(user)

    def register_user(self, user_create: UserCreate) -> UserResponse:
        if self.get_user_by_username(user_create.username):
            raise ValueError(f"用户名 '{user_create.username}' 已存在")
        
        tenant = tenant_service.get_tenant_by_id(user_create.tenant_id)
        if not tenant:
            raise ValueError(f"租户 ID '{user_create.tenant_id}' 不存在")
        
        user_create.status = UserStatus.PENDING
        user_create.role_code = "USER"
        
        logger.info(f"[用户服务] 用户注册申请: {user_create.username} (租户ID: {user_create.tenant_id})")
        
        return self.create_user(user_create)

    def get_pending_users(self) -> List[UserResponse]:
        return [
            self._to_response(user)
            for user in self.users
            if user.status == UserStatus.PENDING
        ]

    def get_rejected_users(self) -> List[UserResponse]:
        return [
            self._to_response(user)
            for user in self.users
            if user.status == UserStatus.REJECTED
        ]

    def get_user_status(self, username: str) -> Optional[UserStatus]:
        user = self.get_user_by_username(username)
        if user:
            return user.status
        return None

    def approve_user(self, user_id: int) -> Optional[UserResponse]:
        user = self.get_user_by_id(user_id)
        if not user:
            logger.warning(f"[用户服务] 审批失败: 用户 ID '{user_id}' 不存在")
            return None
        
        if user.status != UserStatus.PENDING:
            logger.warning(f"[用户服务] 审批失败: 用户 '{user.username}' 状态不是待审核")
            return None
        
        user.status = UserStatus.ACTIVE
        user.updated_at = datetime.now()
        
        logger.info(f"[用户服务] 用户 '{user.username}' 审批通过，状态更新为 ACTIVE")
        
        return self._to_response(user)

    def reject_user(self, user_id: int, reason: Optional[str] = None) -> bool:
        user = self.get_user_by_id(user_id)
        if not user:
            logger.warning(f"[用户服务] 驳回失败: 用户 ID '{user_id}' 不存在")
            return False
        
        if user.status != UserStatus.PENDING:
            logger.warning(f"[用户服务] 驳回失败: 用户 '{user.username}' 状态不是待审核")
            return False
        
        user.status = UserStatus.REJECTED
        user.updated_at = datetime.now()
        
        if reason:
            logger.info(f"[用户服务] 用户 '{user.username}' 被驳回，原因: {reason}")
        else:
            logger.info(f"[用户服务] 用户 '{user.username}' 被驳回")
        
        return True

    def delete_pending_user(self, user_id: int) -> bool:
        for i, user in enumerate(self.users):
            if user.id == user_id and user.status == UserStatus.PENDING:
                del self.users[i]
                logger.info(f"[用户服务] 删除待审核用户: ID={user_id}")
                return True
        return False

    def initialize_default_users(self):
        from app.services.tenant_service import tenant_service
        
        tenant_service.initialize_default_tenants()
        
        tenant_a = tenant_service.get_tenant_by_code("TENANT_A")
        tenant_b = tenant_service.get_tenant_by_code("TENANT_B")
        
        default_users = [
            UserCreate(
                username="admin",
                password="admin123",
                email="admin@tourism.com",
                role_code="ADMIN",
                tenant_id=tenant_a.id if tenant_a else None
            ),
            UserCreate(
                username="user",
                password="user123",
                email="user@tourism.com",
                role_code="USER",
                tenant_id=tenant_a.id if tenant_a else None
            ),
            UserCreate(
                username="tenant_a_admin",
                password="admin123",
                email="admin_a@tourism.com",
                role_code="ADMIN",
                tenant_id=tenant_a.id if tenant_a else None
            ),
            UserCreate(
                username="tenant_b_admin",
                password="admin123",
                email="admin_b@tourism.com",
                role_code="ADMIN",
                tenant_id=tenant_b.id if tenant_b else None
            ),
            UserCreate(
                username="tenant_b_user",
                password="user123",
                email="user_b@tourism.com",
                role_code="USER",
                tenant_id=tenant_b.id if tenant_b else None
            )
        ]
        
        for user_create in default_users:
            if not self.get_user_by_username(user_create.username):
                created_user = self.create_user(user_create)
                logger.info(f"[用户初始化] 创建默认用户: {created_user.username} (角色: {created_user.role_code}, 租户ID: {created_user.tenant_id})")
            else:
                logger.info(f"[用户初始化] 默认用户已存在: {user_create.username}")


user_service = UserService()
