import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from app.models.user import UserResponse

logger = logging.getLogger(__name__)

SECRET_KEY = "tourism-big-data-secret-key-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24


class JWTUtils:
    @staticmethod
    def create_access_token(user: UserResponse, expires_delta: Optional[timedelta] = None) -> str:
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode = {
            "sub": user.username,
            "user_id": user.id,
            "role": user.role_code,
            "exp": expire,
            "iat": datetime.utcnow()
        }
        
        logger.info(f"[JWT 工具] 为用户 '{user.username}' 生成 Token，角色: {user.role_code}")
        logger.info(f"[JWT 工具] Token 负载: {to_encode}")
        
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    @staticmethod
    def decode_token(token: str) -> Optional[Dict[str, Any]]:
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            logger.info(f"[JWT 工具] Token 解码成功: {payload}")
            return payload
        except JWTError as e:
            logger.error(f"[JWT 工具] Token 解码失败: {e}")
            return None

    @staticmethod
    def get_user_from_token(token: str) -> Optional[Dict[str, Any]]:
        payload = JWTUtils.decode_token(token)
        if payload is None:
            return None
        
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        role: str = payload.get("role")
        
        if username is None or user_id is None or role is None:
            logger.error("[JWT 工具] Token 中缺少必要的用户信息")
            return None
        
        return {
            "username": username,
            "user_id": user_id,
            "role": role
        }

    @staticmethod
    def is_token_expired(token: str) -> bool:
        payload = JWTUtils.decode_token(token)
        if payload is None:
            return True
        
        exp = payload.get("exp")
        if exp is None:
            return True
        
        expire_time = datetime.utcfromtimestamp(exp)
        return datetime.utcnow() > expire_time


jwt_utils = JWTUtils()
