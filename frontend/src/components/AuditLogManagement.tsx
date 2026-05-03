import React, { useState, useEffect } from 'react';
import { 
  AuditLog, 
  AuditLogPagedResponse, 
  OperationType, 
  OperationTypeOption 
} from '../types';
import { 
  getAuditLogs, 
  getOperationTypes, 
  getStatusOptions, 
  GetAuditLogsParams 
} from '../api';
import { useToast } from '../contexts/ToastContext';

const OPERATION_TYPE_LABELS: Record<string, string> = {
  'tenant:create': '创建租户',
  'tenant:update': '更新租户',
  'tenant:delete': '删除租户',
  'tenant:clone': '克隆租户',
  'tenant:enable': '启用租户',
  'tenant:disable': '禁用租户',
  'role:create': '创建角色',
  'role:update': '更新角色',
  'role:delete': '删除角色',
  'permission:create': '创建权限',
  'permission:update': '更新权限',
  'permission:delete': '删除权限',
  'user:approve': '用户审批',
  'user:reject': '用户驳回',
  'itinerary:create': '创建行程',
  'itinerary:update': '更新行程',
  'itinerary:delete': '删除行程',
  'quota:reset': '重置配额',
  'role:permission:update': '更新角色权限',
  'tenant:role:update': '更新租户角色授权'
};

const formatOperationType = (type: string): string => {
  return OPERATION_TYPE_LABELS[type] || type;
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const formatDateTimeForApi = (dateTimeStr: string, isEndTime: boolean = false): string => {
  if (!dateTimeStr) return '';
  
  let datePart: string;
  let timePart: string;
  
  if (dateTimeStr.includes('T')) {
    const [date, time] = dateTimeStr.split('T');
    datePart = date;
    timePart = time || '';
  } else {
    datePart = dateTimeStr;
    timePart = '';
  }
  
  if (!timePart) {
    timePart = isEndTime ? '23:59:59' : '00:00:00';
  } else {
    const timeParts = timePart.split(':');
    if (timeParts.length < 3) {
      timePart = isEndTime 
        ? `${timePart}:59` 
        : `${timePart}:00`;
    }
  }
  
  return `${datePart} ${timePart}`;
};

const formatDetails = (details: Record<string, any> | null): string => {
  if (!details || Object.keys(details).length === 0) {
    return '-';
  }
  
  const parts: string[] = [];
  
  if (details.source_tenant_name && details.new_tenant_name) {
    parts.push(`从 "${details.source_tenant_name}" 克隆为 "${details.new_tenant_name}"`);
  }
  if (details.source_tenant_code && details.new_tenant_code) {
    parts.push(`代码: ${details.source_tenant_code} → ${details.new_tenant_code}`);
  }
  if (details.cloned_roles_count !== undefined && details.cloned_permissions_count !== undefined) {
    parts.push(`已克隆 ${details.cloned_roles_count} 个角色, ${details.cloned_permissions_count} 个权限`);
  }
  
  if (details.username) {
    parts.push(`用户: ${details.username}`);
  }
  if (details.reason) {
    parts.push(`原因: ${details.reason}`);
  }
  
  if (details.operation) {
    parts.push(`操作: ${details.operation}`);
  }
  
  if (parts.length === 0) {
    try {
      return JSON.stringify(details);
    } catch {
      return '-';
    }
  }
  
  return parts.join(' | ');
};

export const AuditLogManagement: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [operationTypes, setOperationTypes] = useState<OperationTypeOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<{ value: 'success' | 'failed'; label: string }[]>([]);
  
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const [filterOperationType, setFilterOperationType] = useState<string>('');
  const [filterOperatorName, setFilterOperatorName] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterStartTime, setFilterStartTime] = useState('');
  const [filterEndTime, setFilterEndTime] = useState('');
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  const toast = useToast();

  const fetchOperationTypes = async () => {
    try {
      const data = await getOperationTypes();
      setOperationTypes(data);
    } catch (err) {
      console.error('[AuditLogManagement] 获取操作类型列表失败:', err);
    }
  };

  const fetchStatusOptions = async () => {
    try {
      const data = await getStatusOptions();
      setStatusOptions(data);
    } catch (err) {
      console.error('[AuditLogManagement] 获取状态列表失败:', err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: GetAuditLogsParams = {
        page,
        page_size: pageSize
      };
      
      if (filterOperationType) {
        params.operation_type = filterOperationType as OperationType;
      }
      if (filterOperatorName) {
        params.operator_name = filterOperatorName;
      }
      if (filterStatus) {
        params.status = filterStatus as 'success' | 'failed';
      }
      
      const formattedStartTime = formatDateTimeForApi(filterStartTime, false);
      const formattedEndTime = formatDateTimeForApi(filterEndTime, true);
      
      if (formattedStartTime) {
        params.start_date = formattedStartTime;
        console.log('[AuditLogManagement] 格式化开始时间:', filterStartTime, '->', formattedStartTime);
      }
      if (formattedEndTime) {
        params.end_date = formattedEndTime;
        console.log('[AuditLogManagement] 格式化结束时间:', filterEndTime, '->', formattedEndTime);
      }
      
      console.log('[AuditLogManagement] 请求参数:', params);
      
      const response: AuditLogPagedResponse = await getAuditLogs(params);
      setLogs(response.items);
      setTotal(response.total);
      setTotalPages(response.total_pages);
      
      console.log('[AuditLogManagement] 获取审计日志成功，总数:', response.total);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取审计日志列表失败';
      setError(errorMessage);
      console.error('[AuditLogManagement] 获取审计日志失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperationTypes();
    fetchStatusOptions();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [page, pageSize]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const handleReset = () => {
    setFilterOperationType('');
    setFilterOperatorName('');
    setFilterStatus('');
    setFilterStartTime('');
    setFilterEndTime('');
    setPage(1);
    setTimeout(() => fetchLogs(), 0);
  };

  const handleViewDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const getStatusStyle = (status: string) => {
    if (status === 'success') {
      return {
        background: '#d1fae5',
        color: '#065f46'
      };
    }
    return {
      background: '#fee2e2',
      color: '#dc2626'
    };
  };

  const getStatusLabel = (status: string) => {
    return status === 'success' ? '成功' : '失败';
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        marginTop: '1.5rem',
        padding: '1rem 0'
      }}>
        <button
          type="button"
          onClick={() => handlePageChange(1)}
          disabled={page === 1}
          style={{
            padding: '0.5rem 1rem',
            background: page === 1 ? '#f3f4f6' : 'white',
            color: page === 1 ? '#9ca3af' : '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            cursor: page === 1 ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          首页
        </button>
        <button
          type="button"
          onClick={() => handlePageChange(page - 1)}
          disabled={page === 1}
          style={{
            padding: '0.5rem 1rem',
            background: page === 1 ? '#f3f4f6' : 'white',
            color: page === 1 ? '#9ca3af' : '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            cursor: page === 1 ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          上一页
        </button>
        
        {pages.map(p => (
          <button
            key={p}
            type="button"
            onClick={() => handlePageChange(p)}
            style={{
              padding: '0.5rem 1rem',
              background: p === page 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                : 'white',
              color: p === page ? 'white' : '#374151',
              border: '1px solid',
              borderColor: p === page ? 'transparent' : '#e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: p === page ? 600 : 500,
              transition: 'all 0.2s'
            }}
          >
            {p}
          </button>
        ))}
        
        <button
          type="button"
          onClick={() => handlePageChange(page + 1)}
          disabled={page === totalPages}
          style={{
            padding: '0.5rem 1rem',
            background: page === totalPages ? '#f3f4f6' : 'white',
            color: page === totalPages ? '#9ca3af' : '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            cursor: page === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          下一页
        </button>
        <button
          type="button"
          onClick={() => handlePageChange(totalPages)}
          disabled={page === totalPages}
          style={{
            padding: '0.5rem 1rem',
            background: page === totalPages ? '#f3f4f6' : 'white',
            color: page === totalPages ? '#9ca3af' : '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            cursor: page === totalPages ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: 500,
            transition: 'all 0.2s'
          }}
        >
          末页
        </button>
        
        <span style={{
          marginLeft: '1rem',
          color: '#6b7280',
          fontSize: '0.875rem'
        }}>
          共 {total} 条记录
        </span>
      </div>
    );
  };

  return (
    <div className="audit-log-management">
      <div className="form-card">
        <div className="card-header">
          <h2>📋 审计日志</h2>
        </div>

        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                color: '#374151',
                fontSize: '0.875rem'
              }}>
                操作类型
              </label>
              <select
                value={filterOperationType}
                onChange={(e) => setFilterOperationType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  background: 'white',
                  transition: 'border-color 0.2s'
                }}
              >
                <option value="">全部类型</option>
                {operationTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                color: '#374151',
                fontSize: '0.875rem'
              }}>
                操作人
              </label>
              <input
                type="text"
                value={filterOperatorName}
                onChange={(e) => setFilterOperatorName(e.target.value)}
                placeholder="输入操作人名称"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
            
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                color: '#374151',
                fontSize: '0.875rem'
              }}>
                状态
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  background: 'white',
                  transition: 'border-color 0.2s'
                }}
              >
                <option value="">全部状态</option>
                {statusOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                color: '#374151',
                fontSize: '0.875rem'
              }}>
                开始时间
              </label>
              <input
                type="datetime-local"
                value={filterStartTime}
                onChange={(e) => setFilterStartTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
            
            <div>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                color: '#374151',
                fontSize: '0.875rem'
              }}>
                结束时间
              </label>
              <input
                type="datetime-local"
                value={filterEndTime}
                onChange={(e) => setFilterEndTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
          </div>
          
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
              }}
            >
              重置筛选
            </button>
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {loading ? (
                <>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                  搜索中...
                </>
              ) : (
                <>
                  🔍 搜索
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading">加载中...</div>
        ) : (
          <div className="table-container">
            <table className="audit-log-table">
              <thead>
                <tr>
                  <th className="col-id">ID</th>
                  <th className="col-operation-type">操作类型</th>
                  <th className="col-operator">操作人</th>
                  <th className="col-details">操作详情</th>
                  <th className="col-status">状态</th>
                  <th className="col-date">操作时间</th>
                  <th className="col-action">操作</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      暂无审计日志数据
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id}>
                      <td className="col-id">{log.id}</td>
                      <td className="col-operation-type">
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          background: '#eef2ff',
                          color: '#4f46e5',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          whiteSpace: 'nowrap'
                        }}>
                          {formatOperationType(log.operation_type)}
                        </span>
                      </td>
                      <td className="col-operator">
                        <span style={{
                          fontWeight: 500,
                          color: '#374151',
                          whiteSpace: 'nowrap'
                        }}>
                          {log.operator_name || '系统'}
                        </span>
                      </td>
                      <td className="col-details">
                        <div style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: '#6b7280',
                          fontSize: '0.875rem',
                          lineHeight: 1.5
                        }} title={formatDetails(log.details)}>
                          {formatDetails(log.details)}
                        </div>
                      </td>
                      <td className="col-status">
                        <span 
                          style={{ 
                            padding: '4px 12px', 
                            borderRadius: '9999px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            ...getStatusStyle(log.status)
                          }}
                        >
                          {getStatusLabel(log.status)}
                        </span>
                      </td>
                      <td className="col-date date-cell">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="col-action">
                        <button
                          type="button"
                          onClick={() => handleViewDetail(log)}
                          style={{
                            padding: '6px 16px',
                            background: '#f9fafb',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#e5e7eb';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f9fafb';
                          }}
                        >
                          👁️ 详情
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && logs.length > 0 && renderPagination()}
      </div>

      {showDetailModal && selectedLog && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ minWidth: '600px' }}>
            <div className="modal-header">
              <h3>📋 审计日志详情</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowDetailModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  日志ID
                </label>
                <div style={{
                  padding: '0.75rem 1rem',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  {selectedLog.id}
                </div>
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  操作类型
                </label>
                <div style={{
                  padding: '0.75rem 1rem',
                  background: '#eef2ff',
                  borderRadius: '8px',
                  fontWeight: 500,
                  color: '#4f46e5'
                }}>
                  {formatOperationType(selectedLog.operation_type)}
                </div>
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  操作人
                </label>
                <div style={{
                  padding: '0.75rem 1rem',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  {selectedLog.operator_name || '系统'}
                  {selectedLog.operator_id && (
                    <span style={{ marginLeft: '0.5rem', color: '#9ca3af', fontSize: '0.875rem' }}>
                      (ID: {selectedLog.operator_id})
                    </span>
                  )}
                </div>
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  状态
                </label>
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontWeight: 500,
                  ...getStatusStyle(selectedLog.status)
                }}>
                  {getStatusLabel(selectedLog.status)}
                </div>
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  目标资源
                </label>
                <div style={{
                  padding: '0.75rem 1rem',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  {selectedLog.target_type ? (
                    <>
                      {selectedLog.target_type}
                      {selectedLog.target_id && (
                        <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>
                          ID: {selectedLog.target_id}
                        </span>
                      )}
                      {selectedLog.target_name && (
                        <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>
                          ({selectedLog.target_name})
                        </span>
                      )}
                    </>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>-</span>
                  )}
                </div>
              </div>
              
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                  color: '#6b7280',
                  fontSize: '0.875rem'
                }}>
                  操作时间
                </label>
                <div style={{
                  padding: '0.75rem 1rem',
                  background: '#f3f4f6',
                  borderRadius: '8px',
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  {formatDate(selectedLog.created_at)}
                </div>
              </div>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 500,
                color: '#6b7280',
                fontSize: '0.875rem'
              }}>
                操作详情
              </label>
              <div style={{
                padding: '1rem',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                lineHeight: 1.6,
                color: '#374151',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {selectedLog.details && Object.keys(selectedLog.details).length > 0 ? (
                  JSON.stringify(selectedLog.details, null, 2)
                ) : (
                  <span style={{ color: '#9ca3af' }}>无详细信息</span>
                )}
              </div>
            </div>
            
            {selectedLog.error_message && (
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 500,
                  color: '#dc2626',
                  fontSize: '0.875rem'
                }}>
                  错误信息
                </label>
                <div style={{
                  padding: '1rem',
                  background: '#fef2f2',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: '0.875rem',
                  lineHeight: 1.6
                }}>
                  {selectedLog.error_message}
                </div>
              </div>
            )}
            
            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowDetailModal(false)}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogManagement;
