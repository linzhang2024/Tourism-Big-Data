import React, { useState, useEffect } from 'react';
import { Tenant, TenantCreate, TenantUpdate, TenantWithQuota, User } from '../types';
import { getTenants, createTenant, updateTenant, deleteTenant, getTenantById, resetTenantQuota, getPendingUsers, approveUser, rejectUser } from '../api';
import { useTenant } from '../contexts/TenantContext';

type TabType = 'tenants' | 'pending';

export const TenantManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('tenants');
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantWithQuota | null>(null);
  const [selectedPendingUser, setSelectedPendingUser] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  const [createFormData, setCreateFormData] = useState<TenantCreate>({
    name: '',
    code: '',
    description: '',
    logo_url: '',
    itinerary_limit: 100,
    ai_calls_limit: 50,
  });
  const [editFormData, setEditFormData] = useState<TenantUpdate>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { currentTenant, refreshTenant } = useTenant();

  const fetchTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTenants();
      setTenants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取租户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    setLoadingPending(true);
    try {
      const data = await getPendingUsers();
      setPendingUsers(data);
      console.log('[TenantManagement] 获取待审核用户:', data);
    } catch (err) {
      console.error('[TenantManagement] 获取待审核用户失败:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingUsers();
    }
  }, [activeTab]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setError(null);
  };

  const getTenantName = (tenantId?: number): string => {
    if (!tenantId) return '未知租户';
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant ? `${tenant.name} (${tenant.code})` : `租户ID: ${tenantId}`;
  };

  const handleCreateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCreateFormData(prev => ({ 
      ...prev, 
      [name]: name === 'itinerary_limit' || name === 'ai_calls_limit' 
        ? parseInt(value) || 0 
        : value 
    }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setEditFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setEditFormData(prev => ({ 
        ...prev, 
        [name]: name === 'itinerary_limit' || name === 'ai_calls_limit' 
          ? parseInt(value) || 0 
          : value 
      }));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await createTenant(createFormData);
      setShowCreateModal(false);
      setCreateFormData({
        name: '',
        code: '',
        description: '',
        logo_url: '',
        itinerary_limit: 100,
        ai_calls_limit: 50,
      });
      fetchTenants();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '创建租户失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    
    setFormError(null);
    setSubmitting(true);

    try {
      await updateTenant(selectedTenant.id, editFormData);
      setShowEditModal(false);
      
      fetchTenants();
      
      if (currentTenant && selectedTenant.id === currentTenant.id) {
        console.log('[TenantManagement] 检测到修改的是当前登录租户，刷新全局租户信息');
        await refreshTenant();
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '更新租户失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = async (tenant: Tenant) => {
    try {
      const detail = await getTenantById(tenant.id);
      setSelectedTenant(detail);
      setEditFormData({
        name: detail.name,
        description: detail.description || '',
        logo_url: detail.logo_url || '',
        is_active: detail.is_active,
        itinerary_limit: detail.itinerary_limit,
        ai_calls_limit: detail.ai_calls_limit,
      });
      setFormError(null);
      setShowEditModal(true);
    } catch (err) {
      console.error('获取租户详情失败:', err);
    }
  };

  const handleOpenDetailModal = async (tenant: Tenant) => {
    try {
      const detail = await getTenantById(tenant.id);
      setSelectedTenant(detail);
      setShowDetailModal(true);
    } catch (err) {
      console.error('获取租户详情失败:', err);
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    if (!window.confirm(`确定要删除租户 "${tenant.name}" 吗？此操作不可恢复。`)) {
      return;
    }

    try {
      await deleteTenant(tenant.id);
      fetchTenants();
    } catch (err) {
      console.error('删除租户失败:', err);
      alert('删除失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  const handleApproveUser = async (user: User) => {
    if (!window.confirm(`确定要通过用户 "${user.username}" 的注册申请吗？`)) {
      return;
    }

    try {
      await approveUser(user.id);
      console.log('[TenantManagement] 用户审批通过:', user.username);
      fetchPendingUsers();
    } catch (err) {
      console.error('审批用户失败:', err);
      alert('审批失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  const handleOpenRejectModal = (user: User) => {
    setSelectedPendingUser(user);
    setRejectReason('');
    setFormError(null);
    setShowRejectModal(true);
  };

  const handleRejectUser = async () => {
    if (!selectedPendingUser) return;
    
    setSubmitting(true);
    setFormError(null);

    try {
      await rejectUser(selectedPendingUser.id, rejectReason || undefined);
      console.log('[TenantManagement] 用户申请被驳回:', selectedPendingUser.username);
      setShowRejectModal(false);
      fetchPendingUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '驳回失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetQuota = async () => {
    if (!selectedTenant) return;
    if (!window.confirm(`确定要重置租户 "${selectedTenant.name}" 的配额使用量吗？`)) {
      return;
    }

    try {
      await resetTenantQuota(selectedTenant.id);
      const updated = await getTenantById(selectedTenant.id);
      setSelectedTenant(updated);
      fetchTenants();
      
      if (currentTenant && selectedTenant.id === currentTenant.id) {
        console.log('[TenantManagement] 检测到重置的是当前登录租户配额，刷新全局租户信息');
        await refreshTenant();
      }
    } catch (err) {
      console.error('重置配额失败:', err);
      alert('重置失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    return '#10b981';
  };

  const isCurrentTenant = (tenant: Tenant) => {
    return currentTenant && tenant.id === currentTenant.id;
  };

  return (
    <div className="tenant-management">
      <div className="form-card">
        <div className="card-header">
          <h2>🏢 租户管理</h2>
          {activeTab === 'tenants' && (
            <button
              type="button"
              className="add-btn"
              onClick={() => setShowCreateModal(true)}
            >
              ➕ 新增租户
            </button>
          )}
        </div>

        <div style={{ 
          display: 'flex', 
          marginBottom: '1.5rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <button
            type="button"
            onClick={() => handleTabChange('tenants')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'none',
              fontSize: '0.95rem',
              fontWeight: activeTab === 'tenants' ? 600 : 400,
              color: activeTab === 'tenants' ? '#667eea' : '#6b7280',
              borderBottom: activeTab === 'tenants' ? '2px solid #667eea' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            🏢 租户列表
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('pending')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'none',
              fontSize: '0.95rem',
              fontWeight: activeTab === 'pending' ? 600 : 400,
              color: activeTab === 'pending' ? '#667eea' : '#6b7280',
              borderBottom: activeTab === 'pending' ? '2px solid #667eea' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ⏳ 待审核
            {pendingUsers.length > 0 && (
              <span style={{
                background: '#f59e0b',
                color: 'white',
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontWeight: 600
              }}>
                {pendingUsers.length}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {activeTab === 'tenants' ? (
          <div>
            {loading ? (
              <div className="loading">加载中...</div>
            ) : (
              <div className="table-container">
                <table className="tenant-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>租户名称</th>
                      <th>代码</th>
                      <th>行程配额</th>
                      <th>AI配额</th>
                      <th>状态</th>
                      <th>创建时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="empty-row">
                          暂无租户数据
                        </td>
                      </tr>
                    ) : (
                      tenants.map(tenant => (
                        <tr 
                          key={tenant.id}
                          style={isCurrentTenant(tenant) ? {
                            background: 'linear-gradient(90deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                            borderLeft: '3px solid #667eea'
                          } : {}}
                        >
                          <td>
                            {tenant.id}
                            {isCurrentTenant(tenant) && (
                              <span style={{
                                marginLeft: '8px',
                                padding: '2px 8px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }}>
                                当前租户
                              </span>
                            )}
                          </td>
                          <td className="tenant-name">
                            {tenant.logo_url ? (
                              <img 
                                src={tenant.logo_url} 
                                alt={tenant.name}
                                style={{ width: '24px', height: '24px', marginRight: '8px', borderRadius: '4px' }}
                              />
                            ) : null}
                            {tenant.name}
                          </td>
                          <td>
                            <span className="tenant-code">{tenant.code}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '80px', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                                <div 
                                  style={{ 
                                    height: '100%', 
                                    background: tenant.itinerary_limit > 0 
                                      ? getPercentageColor((tenant.itinerary_used / tenant.itinerary_limit) * 100)
                                      : '#10b981',
                                    width: `${tenant.itinerary_limit > 0 
                                      ? Math.min((tenant.itinerary_used / tenant.itinerary_limit) * 100, 100)
                                      : 0}%`,
                                    transition: 'width 0.3s'
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                {tenant.itinerary_used}/{tenant.itinerary_limit}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '80px', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                                <div 
                                  style={{ 
                                    height: '100%', 
                                    background: tenant.ai_calls_limit > 0 
                                      ? getPercentageColor((tenant.ai_calls_used / tenant.ai_calls_limit) * 100)
                                      : '#10b981',
                                    width: `${tenant.ai_calls_limit > 0 
                                      ? Math.min((tenant.ai_calls_used / tenant.ai_calls_limit) * 100, 100)
                                      : 0}%`,
                                    transition: 'width 0.3s'
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                {tenant.ai_calls_used}/{tenant.ai_calls_limit}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span 
                              style={{ 
                                padding: '4px 12px', 
                                borderRadius: '9999px',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                background: tenant.is_active ? '#d1fae5' : '#fee2e2',
                                color: tenant.is_active ? '#065f46' : '#dc2626'
                              }}
                            >
                              {tenant.is_active ? '✓ 激活' : '✗ 停用'}
                            </span>
                          </td>
                          <td className="date-cell">{formatDate(tenant.created_at)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                className="view-btn"
                                onClick={() => handleOpenDetailModal(tenant)}
                                style={{
                                  padding: '4px 8px',
                                  background: '#dbeafe',
                                  color: '#1d4ed8',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem'
                                }}
                              >
                                👁️ 查看
                              </button>
                              <button
                                type="button"
                                className="edit-btn"
                                onClick={() => handleOpenEditModal(tenant)}
                                style={{
                                  padding: '4px 8px',
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem'
                                }}
                              >
                                ✏️ 编辑
                              </button>
                              {!isCurrentTenant(tenant) && (
                                <button
                                  type="button"
                                  className="delete-btn"
                                  onClick={() => handleDeleteTenant(tenant)}
                                  style={{
                                    padding: '4px 8px',
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  🗑️ 删除
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            {loadingPending ? (
              <div className="loading">加载待审核用户中...</div>
            ) : (
              <div className="table-container">
                <table className="tenant-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>用户名</th>
                      <th>邮箱</th>
                      <th>目标租户</th>
                      <th>申请时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty-row">
                          🎉 暂无待审核用户
                        </td>
                      </tr>
                    ) : (
                      pendingUsers.map(user => (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.9rem'
                              }}>
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{user.username}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  角色: 普通用户
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>{user.email || '-'}</td>
                          <td>
                            <span style={{
                              background: '#fef3c7',
                              color: '#92400e',
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '0.875rem',
                              fontWeight: 500
                            }}>
                              {getTenantName(user.tenant_id)}
                            </span>
                          </td>
                          <td className="date-cell">{formatDate(user.created_at)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleApproveUser(user)}
                                style={{
                                  padding: '6px 16px',
                                  background: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: 500,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                ✓ 通过
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRejectModal(user)}
                                style={{
                                  padding: '6px 16px',
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: 500,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                ✗ 驳回
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新增租户</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="error-message">{formError}</div>
            )}

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label htmlFor="create-name">租户名称 <span className="required">*</span></label>
                <input
                  id="create-name"
                  name="name"
                  type="text"
                  value={createFormData.name}
                  onChange={handleCreateInputChange}
                  placeholder="例如：公司A"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="create-code">租户代码 <span className="required">*</span></label>
                <input
                  id="create-code"
                  name="code"
                  type="text"
                  value={createFormData.code}
                  onChange={handleCreateInputChange}
                  placeholder="例如：TENANT_A"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="create-description">描述</label>
                <textarea
                  id="create-description"
                  name="description"
                  value={createFormData.description || ''}
                  onChange={handleCreateInputChange}
                  placeholder="租户详细描述"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="create-logo">Logo URL</label>
                <input
                  id="create-logo"
                  name="logo_url"
                  type="text"
                  value={createFormData.logo_url || ''}
                  onChange={handleCreateInputChange}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="create-itinerary-limit">行程数量上限</label>
                  <input
                    id="create-itinerary-limit"
                    name="itinerary_limit"
                    type="number"
                    min="0"
                    value={createFormData.itinerary_limit || 100}
                    onChange={handleCreateInputChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="create-ai-limit">AI调用次数上限</label>
                  <input
                    id="create-ai-limit"
                    name="ai_calls_limit"
                    type="number"
                    min="0"
                    value={createFormData.ai_calls_limit || 50}
                    onChange={handleCreateInputChange}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting}
                >
                  {submitting ? '提交中...' : '确认'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedTenant && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>编辑租户 - {selectedTenant.name}</h3>
              {isCurrentTenant(selectedTenant) && (
                <span style={{
                  padding: '4px 12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}>
                  当前租户
                </span>
              )}
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>

            {isCurrentTenant(selectedTenant) && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'linear-gradient(90deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                borderLeft: '3px solid #667eea',
                borderRadius: '4px',
                marginBottom: '1rem',
                fontSize: '0.875rem',
                color: '#4c51bf'
              }}>
                ⚠️ 您正在编辑当前登录的租户。修改后，页面左上角的租户信息将自动同步更新。
              </div>
            )}

            {formError && (
              <div className="error-message">{formError}</div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label htmlFor="edit-name">租户名称</label>
                <input
                  id="edit-name"
                  name="name"
                  type="text"
                  value={editFormData.name || ''}
                  onChange={handleEditInputChange}
                  placeholder="例如：公司A"
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-description">描述</label>
                <textarea
                  id="edit-description"
                  name="description"
                  value={editFormData.description || ''}
                  onChange={handleEditInputChange}
                  placeholder="租户详细描述"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-logo">Logo URL</label>
                <input
                  id="edit-logo"
                  name="logo_url"
                  type="text"
                  value={editFormData.logo_url || ''}
                  onChange={handleEditInputChange}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="edit-itinerary-limit">行程数量上限</label>
                  <input
                    id="edit-itinerary-limit"
                    name="itinerary_limit"
                    type="number"
                    min="0"
                    value={editFormData.itinerary_limit || 0}
                    onChange={handleEditInputChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-ai-limit">AI调用次数上限</label>
                  <input
                    id="edit-ai-limit"
                    name="ai_calls_limit"
                    type="number"
                    min="0"
                    value={editFormData.ai_calls_limit || 0}
                    onChange={handleEditInputChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={editFormData.is_active ?? true}
                    onChange={handleEditInputChange}
                  />
                  <span>启用租户</span>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowEditModal(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting}
                >
                  {submitting ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedTenant && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>租户详情 - {selectedTenant.name}</h3>
              {isCurrentTenant(selectedTenant) && (
                <span style={{
                  padding: '4px 12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}>
                  当前租户
                </span>
              )}
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowDetailModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1rem 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>租户代码</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>{selectedTenant.code}</div>
                </div>
                <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>状态</div>
                  <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: 600, 
                    color: selectedTenant.is_active ? '#065f46' : '#dc2626' 
                  }}>
                    {selectedTenant.is_active ? '✓ 激活' : '✗ 停用'}
                  </div>
                </div>
              </div>

              {selectedTenant.description && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>描述</div>
                  <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', color: '#374151' }}>
                    {selectedTenant.description}
                  </div>
                </div>
              )}

              <h4 style={{ margin: '1.5rem 0 1rem', color: '#374151' }}>📊 配额使用情况</h4>
              
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 500 }}>🗺️ 行程数量</span>
                  <span style={{ color: '#6b7280' }}>
                    {selectedTenant.itinerary_used} / {selectedTenant.itinerary_limit} 
                    ({selectedTenant.itinerary_percentage}%)
                  </span>
                </div>
                <div style={{ height: '12px', background: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      background: getPercentageColor(selectedTenant.itinerary_percentage),
                      width: `${Math.min(selectedTenant.itinerary_percentage, 100)}%`,
                      transition: 'width 0.3s'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                  <span style={{ color: '#10b981' }}>剩余: {selectedTenant.itinerary_remaining}</span>
                  <span style={{ color: '#6b7280' }}>已用: {selectedTenant.itinerary_used}</span>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 500 }}>🤖 AI调用次数</span>
                  <span style={{ color: '#6b7280' }}>
                    {selectedTenant.ai_calls_used} / {selectedTenant.ai_calls_limit} 
                    ({selectedTenant.ai_calls_percentage}%)
                  </span>
                </div>
                <div style={{ height: '12px', background: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      background: getPercentageColor(selectedTenant.ai_calls_percentage),
                      width: `${Math.min(selectedTenant.ai_calls_percentage, 100)}%`,
                      transition: 'width 0.3s'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                  <span style={{ color: '#10b981' }}>剩余: {selectedTenant.ai_calls_remaining}</span>
                  <span style={{ color: '#6b7280' }}>已用: {selectedTenant.ai_calls_used}</span>
                </div>
              </div>

              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', fontSize: '0.875rem', color: '#6b7280' }}>
                <div>创建时间: {formatDate(selectedTenant.created_at)}</div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={handleResetQuota}
                style={{ background: '#fef3c7', color: '#92400e' }}
              >
                🔄 重置配额
              </button>
              <button
                type="button"
                className="submit-btn"
                onClick={() => {
                  handleOpenEditModal(selectedTenant);
                  setShowDetailModal(false);
                }}
              >
                ✏️ 编辑
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && selectedPendingUser && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>驳回注册申请</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowRejectModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ 
                padding: '1rem',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  确认驳回用户申请
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                  用户名: <strong>{selectedPendingUser.username}</strong>
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                  目标租户: <strong>{getTenantName(selectedPendingUser.tenant_id)}</strong>
                </div>
              </div>
            </div>

            {formError && (
              <div className="error-message">{formError}</div>
            )}

            <div className="form-group">
              <label htmlFor="reject-reason">驳回原因（可选）</label>
              <textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入驳回原因..."
                rows={3}
                style={{ width: '100%' }}
              />
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowRejectModal(false)}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleRejectUser}
                disabled={submitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: submitting ? 0.5 : 1
                }}
              >
                {submitting ? '处理中...' : '确认驳回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
