from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class OperationType(str, Enum):
    TENANT_CREATE = "tenant:create"
    TENANT_UPDATE = "tenant:update"
    TENANT_DELETE = "tenant:delete"
    TENANT_CLONE = "tenant:clone"
    TENANT_ENABLE = "tenant:enable"
    TENANT_DISABLE = "tenant:disable"
    ROLE_CREATE = "role:create"
    ROLE_UPDATE = "role:update"
    ROLE_DELETE = "role:delete"
    PERMISSION_CREATE = "permission:create"
    PERMISSION_UPDATE = "permission:update"
    PERMISSION_DELETE = "permission:delete"
    USER_APPROVE = "user:approve"
    USER_REJECT = "user:reject"
    ITINERARY_CREATE = "itinerary:create"
    ITINERARY_UPDATE = "itinerary:update"
    ITINERARY_DELETE = "itinerary:delete"
    QUOTA_RESET = "quota:reset"
    ROLE_PERMISSION_UPDATE = "role:permission:update"
    TENANT_ROLE_UPDATE = "tenant:role:update"


class OperationStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"


class AuditLogBase(BaseModel):
    operation_type: str = Field(..., description="操作类型")
    operator_id: Optional[int] = Field(None, description="操作人ID")
    operator_name: Optional[str] = Field(None, description="操作人姓名")
    target_type: Optional[str] = Field(None, description="目标资源类型")
    target_id: Optional[int] = Field(None, description="目标资源ID")
    target_name: Optional[str] = Field(None, description="目标资源名称")
    details: Optional[Dict[str, Any]] = Field(None, description="操作详情(JSON格式)")
    status: str = Field(default=OperationStatus.SUCCESS, description="操作状态")
    error_message: Optional[str] = Field(None, description="错误信息（操作失败时）")
    tenant_id: Optional[int] = Field(None, description="操作所属租户ID")


class AuditLogCreate(AuditLogBase):
    pass


class AuditLogResponse(AuditLogBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int = Field(..., description="审计日志唯一ID")
    created_at: datetime = Field(..., description="操作时间")


class AuditLogPagedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    items: List[AuditLogResponse] = Field(..., description="审计日志列表")
    total: int = Field(..., description="总记录数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页大小")
    total_pages: int = Field(..., description="总页数")


OPERATION_TYPE_DISPLAY: Dict[str, str] = {
    OperationType.TENANT_CREATE: "创建租户",
    OperationType.TENANT_UPDATE: "更新租户",
    OperationType.TENANT_DELETE: "删除租户",
    OperationType.TENANT_CLONE: "克隆租户",
    OperationType.TENANT_ENABLE: "启用租户",
    OperationType.TENANT_DISABLE: "禁用租户",
    OperationType.ROLE_CREATE: "创建角色",
    OperationType.ROLE_UPDATE: "更新角色",
    OperationType.ROLE_DELETE: "删除角色",
    OperationType.PERMISSION_CREATE: "创建权限",
    OperationType.PERMISSION_UPDATE: "更新权限",
    OperationType.PERMISSION_DELETE: "删除权限",
    OperationType.USER_APPROVE: "审批通过用户",
    OperationType.USER_REJECT: "驳回用户申请",
    OperationType.ITINERARY_CREATE: "创建行程",
    OperationType.ITINERARY_UPDATE: "更新行程",
    OperationType.ITINERARY_DELETE: "删除行程",
    OperationType.QUOTA_RESET: "重置配额",
    OperationType.ROLE_PERMISSION_UPDATE: "更新角色权限",
    OperationType.TENANT_ROLE_UPDATE: "更新租户角色",
}


def get_operation_display(operation_type: str) -> str:
    return OPERATION_TYPE_DISPLAY.get(operation_type, operation_type)
