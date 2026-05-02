import React, { useState, useEffect } from 'react';
import { RoleResponse, RoleCreate, PermissionResponse } from '../types';
import { getRoles, createRole, getPermissions, updateRolePermissions } from '../api';

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleResponse | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [formData, setFormData] = useState<RoleCreate>({
    name: '',
    code: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [permissionSaving, setPermissionSaving] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取角色列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const data = await getPermissions();
      setPermissions(data);
    } catch (err) {
      console.error('获取权限列表失败:', err);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await createRole(formData);
      setShowModal(false);
      setFormData({ name: '', code: '', description: '' });
      fetchRoles();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '创建角色失败');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const handleOpenPermissionModal = (role: RoleResponse) => {
    setSelectedRole(role);
    setSelectedPermissions(role.permissions.map(p => p.code));
    setPermissionError(null);
    setShowPermissionModal(true);
  };

  const handlePermissionToggle = (permissionCode: string) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permissionCode)) {
        return prev.filter(code => code !== permissionCode);
      } else {
        return [...prev, permissionCode];
      }
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    
    setPermissionSaving(true);
    setPermissionError(null);
    
    try {
      await updateRolePermissions(selectedRole.id, selectedPermissions);
      setShowPermissionModal(false);
      fetchRoles();
    } catch (err) {
      setPermissionError(err instanceof Error ? err.message : '更新权限失败');
    } finally {
      setPermissionSaving(false);
    }
  };

  return (
    <div className="role-management">
      <div className="form-card">
        <div className="card-header">
          <h2>🎭 角色管理</h2>
          <button
            type="button"
            className="add-btn"
            onClick={() => setShowModal(true)}
          >
            ➕ 新增角色
          </button>
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
            <table className="role-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>角色名</th>
                  <th>代码</th>
                  <th>描述</th>
                  <th>权限数量</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-row">
                      暂无角色数据
                    </td>
                  </tr>
                ) : (
                  roles.map(role => (
                    <tr key={role.id}>
                      <td>{role.id}</td>
                      <td className="role-name">{role.name}</td>
                      <td>
                        <span className="role-code">{role.code}</span>
                      </td>
                      <td className="role-desc">{role.description || '-'}</td>
                      <td>{role.permissions.length}</td>
                      <td className="date-cell">{formatDate(role.created_at)}</td>
                      <td>
                        <button
                          type="button"
                          className="permission-btn"
                          onClick={() => handleOpenPermissionModal(role)}
                        >
                          🔧 权限设置
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新增角色</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="error-message">{formError}</div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">角色名称 <span className="required">*</span></label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="例如：管理员"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="code">角色代码 <span className="required">*</span></label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  value={formData.code}
                  onChange={handleInputChange}
                  placeholder="例如：ADMIN"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">描述</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="角色详细描述"
                  rows={3}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
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

      {showPermissionModal && selectedRole && (
        <div className="modal-overlay" onClick={() => setShowPermissionModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header">
              <h3>权限设置 - {selectedRole.name}</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowPermissionModal(false)}
              >
                ✕
              </button>
            </div>

            {permissionError && (
              <div className="error-message">{permissionError}</div>
            )}

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              {permissions.length === 0 ? (
                <div className="empty-permissions">暂无权限数据</div>
              ) : (
                <>
                  {(() => {
                    const menuPermissions = permissions.filter(p => p.permission_type === 'menu');
                    const dataPermissions = permissions.filter(p => p.permission_type === 'data');
                    
                    const renderPermissionGroup = (title: string, type: string, perms: typeof permissions, icon: string) => {
                      if (perms.length === 0) return null;
                      
                      const allSelected = perms.every(p => selectedPermissions.includes(p.code));
                      const someSelected = perms.some(p => selectedPermissions.includes(p.code));
                      
                      const handleSelectAll = () => {
                        if (allSelected) {
                          const newSelected = selectedPermissions.filter(code => 
                            !perms.some(p => p.code === code)
                          );
                          setSelectedPermissions(newSelected);
                        } else {
                          const newSelected = [...selectedPermissions];
                          perms.forEach(p => {
                            if (!newSelected.includes(p.code)) {
                              newSelected.push(p.code);
                            }
                          });
                          setSelectedPermissions(newSelected);
                        }
                      };
                      
                      return (
                        <div key={type} style={{ marginBottom: '1.5rem' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            padding: '0.75rem 1rem',
                            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                            borderRadius: '8px',
                            marginBottom: '0.75rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#374151' }}>
                              <span>{icon}</span>
                              <span>{title}</span>
                              <span style={{ 
                                fontSize: '0.75rem', 
                                color: '#6b7280', 
                                background: '#e5e7eb',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                fontWeight: 400
                              }}>
                                {perms.filter(p => selectedPermissions.includes(p.code)).length}/{perms.length}
                              </span>
                            </div>
                            <label style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px', 
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              color: '#6b7280'
                            }}>
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = someSelected && !allSelected;
                                }}
                                onChange={handleSelectAll}
                              />
                              <span>全选</span>
                            </label>
                          </div>
                          
                          <div style={{ display: 'grid', gap: '4px' }}>
                            {perms.map(permission => (
                              <label key={permission.id} className="permission-item" style={{ margin: 0 }}>
                                <input
                                  type="checkbox"
                                  checked={selectedPermissions.includes(permission.code)}
                                  onChange={() => handlePermissionToggle(permission.code)}
                                  className="permission-checkbox"
                                />
                                <div className="permission-info">
                                  <div className="permission-name">{permission.name}</div>
                                  <div className="permission-code">{permission.code}</div>
                                  <div className="permission-desc">{permission.description || '暂无描述'}</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    };
                    
                    return (
                      <>
                        {renderPermissionGroup('菜单权限', 'menu', menuPermissions, '📋')}
                        {renderPermissionGroup('数据权限', 'data', dataPermissions, '🔧')}
                      </>
                    );
                  })()}
                </>
              )}
            </div>

            <div className="modal-footer" style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', marginTop: '0' }}>
              <div style={{ marginRight: 'auto', color: '#6b7280', fontSize: '0.875rem' }}>
                已选择 <strong style={{ color: '#667eea' }}>{selectedPermissions.length}</strong> 个权限
              </div>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowPermissionModal(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="submit-btn"
                onClick={handleSavePermissions}
                disabled={permissionSaving}
              >
                {permissionSaving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
