from enum import IntEnum
from typing import Optional


class ErrorCode(IntEnum):
    SUCCESS = 0
    
    TENANT_CODE_EXISTS = 40001
    TENANT_NOT_FOUND = 40002
    TENANT_DISABLED = 40003
    
    ROLE_CODE_EXISTS = 40010
    ROLE_NOT_FOUND = 40011
    
    PERMISSION_NOT_FOUND = 40020
    
    USER_NOT_FOUND = 40030
    USER_ALREADY_EXISTS = 40031
    USER_INVALID_CREDENTIALS = 40032
    
    INVALID_REQUEST = 40000
    INTERNAL_ERROR = 50000


ERROR_MESSAGES = {
    ErrorCode.TENANT_CODE_EXISTS: "租户代码 [{tenant_code}] 已存在，请更换后重试",
    ErrorCode.TENANT_NOT_FOUND: "租户 ID [{tenant_id}] 不存在",
    ErrorCode.TENANT_DISABLED: "租户 [{tenant_name}] 已被禁用，无法执行此操作",
    ErrorCode.ROLE_CODE_EXISTS: "角色代码 [{role_code}] 已存在",
    ErrorCode.ROLE_NOT_FOUND: "角色 ID [{role_id}] 不存在",
    ErrorCode.PERMISSION_NOT_FOUND: "权限代码 [{perm_code}] 不存在",
    ErrorCode.USER_NOT_FOUND: "用户 ID [{user_id}] 不存在",
    ErrorCode.USER_ALREADY_EXISTS: "用户名 [{username}] 已存在",
    ErrorCode.USER_INVALID_CREDENTIALS: "用户名或密码错误",
    ErrorCode.INVALID_REQUEST: "请求参数无效",
    ErrorCode.INTERNAL_ERROR: "服务器内部错误",
}


class BusinessException(Exception):
    def __init__(
        self, 
        code: ErrorCode, 
        message: Optional[str] = None,
        **kwargs
    ):
        self.code = code
        self.kwargs = kwargs
        
        if message is None:
            message_template = ERROR_MESSAGES.get(code, "未知错误")
            try:
                self.message = message_template.format(**kwargs)
            except (KeyError, IndexError):
                self.message = message_template
        else:
            self.message = message
        
        super().__init__(self.message)
    
    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "message": self.message
        }
    
    def __str__(self) -> str:
        return f"[BusinessException] code={self.code}, message={self.message}"
