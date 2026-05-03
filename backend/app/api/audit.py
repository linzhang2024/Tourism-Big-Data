import logging
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import datetime

from app.models.audit_log import (
    AuditLogPagedResponse,
    AuditLogResponse,
    OperationType,
    OperationStatus,
    get_operation_display,
)
from app.services.audit_log_service import audit_log_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=AuditLogPagedResponse)
async def get_audit_logs(
    page: int = Query(1, ge=1, description="页码，从1开始"),
    page_size: int = Query(20, ge=1, le=100, description="每页大小"),
    operation_type: Optional[str] = Query(None, description="操作类型筛选"),
    operator_name: Optional[str] = Query(None, description="操作人姓名筛选"),
    status: Optional[str] = Query(None, description="操作状态筛选"),
    target_type: Optional[str] = Query(None, description="目标类型筛选"),
    start_date: Optional[datetime] = Query(None, description="开始时间"),
    end_date: Optional[datetime] = Query(None, description="结束时间"),
):
    logger.info(f"[审计日志API] 获取审计日志列表: page={page}, page_size={page_size}")
    
    return audit_log_service.get_logs_paged(
        page=page,
        page_size=page_size,
        operation_type=operation_type,
        operator_name=operator_name,
        status=status,
        target_type=target_type,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/types", response_model=list[dict])
async def get_operation_types():
    logger.info("[审计日志API] 获取操作类型列表")
    return [
        {"value": ot.value, "label": get_operation_display(ot.value)}
        for ot in OperationType
    ]


@router.get("/statuses", response_model=list[dict])
async def get_operation_statuses():
    logger.info("[审计日志API] 获取操作状态列表")
    return [
        {"value": os.value, "label": "成功" if os == OperationStatus.SUCCESS else "失败"}
        for os in OperationStatus
    ]


@router.get("/{log_id}", response_model=AuditLogResponse)
async def get_audit_log_detail(log_id: int):
    logger.info(f"[审计日志API] 获取审计日志详情: log_id={log_id}")
    
    log = audit_log_service.get_log_by_id(log_id)
    if log is None:
        raise HTTPException(
            status_code=404,
            detail=f"审计日志 ID '{log_id}' 不存在"
        )
    return log
