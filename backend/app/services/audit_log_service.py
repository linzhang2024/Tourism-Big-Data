import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from collections import deque

from app.models.audit_log import (
    AuditLogCreate,
    AuditLogResponse,
    AuditLogPagedResponse,
    OperationStatus,
    OperationType,
)

logger = logging.getLogger(__name__)

MAX_LOG_COUNT = 10000


class AuditLogService:
    def __init__(self):
        self.logs: deque = deque(maxlen=MAX_LOG_COUNT)
        self.next_id: int = 1

    def log_operation(
        self,
        operation_type: str,
        operator_id: Optional[int] = None,
        operator_name: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[int] = None,
        target_name: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        status: str = OperationStatus.SUCCESS,
        error_message: Optional[str] = None,
        tenant_id: Optional[int] = None,
    ) -> AuditLogResponse:
        log_create = AuditLogCreate(
            operation_type=operation_type,
            operator_id=operator_id,
            operator_name=operator_name,
            target_type=target_type,
            target_id=target_id,
            target_name=target_name,
            details=details,
            status=status,
            error_message=error_message,
            tenant_id=tenant_id,
        )
        
        log_response = AuditLogResponse(
            id=self.next_id,
            created_at=datetime.now(),
            **log_create.model_dump()
        )
        
        self.logs.appendleft(log_response)
        self.next_id += 1
        
        if status == OperationStatus.SUCCESS:
            logger.info(
                f"[审计日志] 操作成功: {operation_type}, "
                f"操作人: {operator_name or '系统'}, "
                f"目标: {target_type}({target_id}) - {target_name}"
            )
        else:
            logger.warning(
                f"[审计日志] 操作失败: {operation_type}, "
                f"操作人: {operator_name or '系统'}, "
                f"错误: {error_message}"
            )
        
        return log_response

    def get_logs_paged(
        self,
        page: int = 1,
        page_size: int = 20,
        operation_type: Optional[str] = None,
        operator_name: Optional[str] = None,
        status: Optional[str] = None,
        target_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> AuditLogPagedResponse:
        filtered_logs = list(self.logs)
        
        if operation_type:
            filtered_logs = [
                log for log in filtered_logs 
                if log.operation_type == operation_type
            ]
        
        if operator_name:
            filtered_logs = [
                log for log in filtered_logs 
                if log.operator_name and operator_name.lower() in log.operator_name.lower()
            ]
        
        if status:
            filtered_logs = [
                log for log in filtered_logs 
                if log.status == status
            ]
        
        if target_type:
            filtered_logs = [
                log for log in filtered_logs 
                if log.target_type == target_type
            ]
        
        if start_date:
            filtered_logs = [
                log for log in filtered_logs 
                if log.created_at >= start_date
            ]
        
        if end_date:
            filtered_logs = [
                log for log in filtered_logs 
                if log.created_at <= end_date
            ]
        
        total = len(filtered_logs)
        total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0
        
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        paged_logs = filtered_logs[start_index:end_index]
        
        return AuditLogPagedResponse(
            items=paged_logs,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    def get_log_by_id(self, log_id: int) -> Optional[AuditLogResponse]:
        for log in self.logs:
            if log.id == log_id:
                return log
        return None

    def log_tenant_create(
        self,
        tenant_id: int,
        tenant_name: str,
        tenant_code: str,
        operator_name: Optional[str] = None,
        operator_id: Optional[int] = None,
    ) -> AuditLogResponse:
        return self.log_operation(
            operation_type=OperationType.TENANT_CREATE,
            operator_id=operator_id,
            operator_name=operator_name,
            target_type="TENANT",
            target_id=tenant_id,
            target_name=f"{tenant_name} ({tenant_code})",
            details={
                "tenant_name": tenant_name,
                "tenant_code": tenant_code,
            }
        )

    def log_tenant_update(
        self,
        tenant_id: int,
        tenant_name: str,
        changes: Dict[str, Any],
        operator_name: Optional[str] = None,
        operator_id: Optional[int] = None,
    ) -> AuditLogResponse:
        return self.log_operation(
            operation_type=OperationType.TENANT_UPDATE,
            operator_id=operator_id,
            operator_name=operator_name,
            target_type="TENANT",
            target_id=tenant_id,
            target_name=tenant_name,
            details={"changes": changes}
        )

    def log_tenant_clone(
        self,
        source_tenant_id: int,
        source_tenant_name: str,
        new_tenant_id: int,
        new_tenant_name: str,
        new_tenant_code: str,
        cloned_roles_count: int,
        cloned_permissions_count: int,
        operator_name: Optional[str] = None,
        operator_id: Optional[int] = None,
    ) -> AuditLogResponse:
        return self.log_operation(
            operation_type=OperationType.TENANT_CLONE,
            operator_id=operator_id,
            operator_name=operator_name,
            target_type="TENANT",
            target_id=new_tenant_id,
            target_name=f"{new_tenant_name} ({new_tenant_code})",
            details={
                "source_tenant_id": source_tenant_id,
                "source_tenant_name": source_tenant_name,
                "new_tenant_id": new_tenant_id,
                "new_tenant_name": new_tenant_name,
                "new_tenant_code": new_tenant_code,
                "cloned_roles_count": cloned_roles_count,
                "cloned_permissions_count": cloned_permissions_count,
            }
        )

    def log_tenant_enable(
        self,
        tenant_id: int,
        tenant_name: str,
        operator_name: Optional[str] = None,
        operator_id: Optional[int] = None,
    ) -> AuditLogResponse:
        return self.log_operation(
            operation_type=OperationType.TENANT_ENABLE,
            operator_id=operator_id,
            operator_name=operator_name,
            target_type="TENANT",
            target_id=tenant_id,
            target_name=tenant_name,
            details={"action": "启用租户"}
        )

    def log_tenant_disable(
        self,
        tenant_id: int,
        tenant_name: str,
        operator_name: Optional[str] = None,
        operator_id: Optional[int] = None,
    ) -> AuditLogResponse:
        return self.log_operation(
            operation_type=OperationType.TENANT_DISABLE,
            operator_id=operator_id,
            operator_name=operator_name,
            target_type="TENANT",
            target_id=tenant_id,
            target_name=tenant_name,
            details={"action": "禁用租户"}
        )

    def log_tenant_delete(
        self,
        tenant_id: int,
        tenant_name: str,
        operator_name: Optional[str] = None,
        operator_id: Optional[int] = None,
    ) -> AuditLogResponse:
        return self.log_operation(
            operation_type=OperationType.TENANT_DELETE,
            operator_id=operator_id,
            operator_name=operator_name,
            target_type="TENANT",
            target_id=tenant_id,
            target_name=tenant_name,
            details={"action": "删除租户"}
        )

    def log_quota_reset(
        self,
        tenant_id: int,
        tenant_name: str,
        operator_name: Optional[str] = None,
        operator_id: Optional[int] = None,
    ) -> AuditLogResponse:
        return self.log_operation(
            operation_type=OperationType.QUOTA_RESET,
            operator_id=operator_id,
            operator_name=operator_name,
            target_type="TENANT",
            target_id=tenant_id,
            target_name=tenant_name,
            details={"action": "重置配额"}
        )

    def log_tenant_role_update(
        self,
        tenant_id: int,
        tenant_name: str,
        old_roles: List[str],
        new_roles: List[str],
        operator_name: Optional[str] = None,
        operator_id: Optional[int] = None,
    ) -> AuditLogResponse:
        added_roles = list(set(new_roles) - set(old_roles))
        removed_roles = list(set(old_roles) - set(new_roles))
        
        return self.log_operation(
            operation_type=OperationType.TENANT_ROLE_UPDATE,
            operator_id=operator_id,
            operator_name=operator_name,
            target_type="TENANT",
            target_id=tenant_id,
            target_name=tenant_name,
            details={
                "old_roles": old_roles,
                "new_roles": new_roles,
                "added_roles": added_roles,
                "removed_roles": removed_roles,
            }
        )

    def log_user_approve(
        self,
        user_id: int,
        username: str,
        operator_name: Optional[str] = None,
        operator_id: Optional[int] = None,
    ) -> AuditLogResponse:
        return self.log_operation(
            operation_type=OperationType.USER_APPROVE,
            operator_id=operator_id,
            operator_name=operator_name,
            target_type="USER",
            target_id=user_id,
            target_name=username,
            details={"action": "审批通过用户注册"}
        )

    def log_user_reject(
        self,
        user_id: int,
        username: str,
        reason: Optional[str] = None,
        operator_name: Optional[str] = None,
        operator_id: Optional[int] = None,
    ) -> AuditLogResponse:
        return self.log_operation(
            operation_type=OperationType.USER_REJECT,
            operator_id=operator_id,
            operator_name=operator_name,
            target_type="USER",
            target_id=user_id,
            target_name=username,
            details={
                "action": "驳回用户注册",
                "reason": reason
            }
        )


audit_log_service = AuditLogService()
