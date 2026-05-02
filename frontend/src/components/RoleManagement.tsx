import React, { useState, useEffect } from 'react';
import { RoleResponse, RoleCreate, PermissionResponse, PermissionCategory } from '../types';
import { getRoles, createRole, getPermissions, updateRolePermissions } from '../api';

const CATEGORY_ICONS: Record<PermissionCategory, string> = {
  '系统管理': '⚙️',
  '行程业务': '🗺️',
  '菜单可见性': '📋',
  '数据操作': '📊',
  '爬虫管理': '🕷️',
};

const CATEGORY_ORDER: PermissionCategory[] = [
  '系统管理',
  '行程业务',
  '菜单可见性',
  '数据操作',
  '爬虫管理',
];

export const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleResponse | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<PermissionCategory>>(
    new Set(CATEGORY_ORDER)
  );
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
    setExpandedCategories(new Set(CATEGORY_ORDER));
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

  const toggleCategory = (category: PermissionCategory) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  const handleCategorySelectAll = (category: string) => {
    const categoryPermissions = permissions.filter(p => p.category === category);
    const allSelected = categoryPermissions.every(p => selectedPermissions.includes(p.code));
    
    if (allSelected) {
      const newSelected = selectedPermissions.filter(code => 
        !categoryPermissions.some(p => p.code === code)
      );
      setSelectedPermissions(newSelected);
    } else {
      const newSelected = [...selectedPermissions];
      categoryPermissions.forEach(p => {
        if (!newSelected.includes(p.code)) {
          newSelected.push(p.code);
        }
      });
      setSelectedPermissions(newSelected);
    }
  };

  const expandAll = () => {
    setExpandedCategories(new Set(CATEGORY_ORDER));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const selectAll = () => {
    setSelectedPermissions(permissions.map(p => p.code));
  };

  const clearAll = () => {
    setSelectedPermissions([]);
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

  const groupPermissionsByCategory = (perms: PermissionResponse[]): Record<PermissionCategory, PermissionResponse[]> => {
    const grouped: Record<string, PermissionResponse[]> = {};
    perms.forEach(perm => {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    });
    return grouped as Record<PermissionCategory, PermissionResponse[]>;
  };

  const groupedPermissions = groupPermissionsByCategory(permissions);

  const getPermissionTypeBadge = (type: string) => {
    if (type === 'menu') {
      return (
        <span style={{
          background: '#dbeafe',
          color: '#1d4ed8',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '0.7rem',
          fontWeight: 500,
          marginLeft: 'auto',
        }}>
          菜单
        </span>
      );
    }
    return (
      <span style={{
        background: '#dcfce7',
        color: '#15803d',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 500,
        marginLeft: 'auto',
      }}>
        数据
      </span>
    );
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
                  value={formData.description || ''}
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
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ 
            maxWidth: '700px', 
            maxHeight: '85vh', 
            display: 'flex', 
            flexDirection: 'column' 
          }}>
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h3>权限设置</h3>
                <span style={{
                  padding: '4px 12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                }}>
                  {selectedRole.name}
                </span>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowPermissionModal(false)}
              >
                ✕
              </button>
            </div>

            {permissionError && (
              <div className="error-message" style={{ margin: '0 1.25rem 1rem', flexShrink: 0 }}>
                {permissionError}
              </div>
            )}

            <div style={{
              padding: '0.75rem 1.25rem',
              background: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={expandAll}
                  style={{
                    padding: '5px 10px',
                    background: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    color: '#374151',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  展开全部
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  style={{
                    padding: '5px 10px',
                    background: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    color: '#374151',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                  }}
                >
                  收起全部
                </button>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={selectAll}
                  style={{
                    padding: '5px 10px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    color: 'white',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                  }}
                >
                  全选
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  style={{
                    padding: '5px 10px',
                    background: '#fee2e2',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    color: '#dc2626',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fecaca';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fee2e2';
                  }}
                >
                  清空
                </button>
              </div>
            </div>

            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: '1rem 1.25rem',
              minHeight: '0',
            }}>
              {permissions.length === 0 ? (
                <div className="empty-permissions">暂无权限数据</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {CATEGORY_ORDER.map(category => {
                    const categoryPerms = groupedPermissions[category] || [];
                    if (categoryPerms.length === 0) return null;
                    
                    const isExpanded = expandedCategories.has(category);
                    const allSelected = categoryPerms.every(p => selectedPermissions.includes(p.code));
                    const someSelected = categoryPerms.some(p => selectedPermissions.includes(p.code));
                    const selectedCount = categoryPerms.filter(p => selectedPermissions.includes(p.code)).length;
                    
                    return (
                      <div
                        key={category}
                        style={{
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          onClick={() => toggleCategory(category)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.875rem 1rem',
                            background: allSelected 
                              ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                              : 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                            cursor: 'pointer',
                            userSelect: 'none',
                            borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                            <label
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCategorySelectAll(category);
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={allSelected}
                                ref={(el) => {
                                  if (el) el.indeterminate = someSelected && !allSelected;
                                }}
                                onChange={() => handleCategorySelectAll(category)}
                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                              />
                            </label>
                            <span style={{ fontSize: '1.1rem' }}>
                              {CATEGORY_ICONS[category]}
                            </span>
                            <div>
                              <div style={{ fontWeight: 600, color: '#374151', fontSize: '0.95rem' }}>
                                {category}
                              </div>
                            </div>
                            <span style={{
                              fontSize: '0.75rem',
                              color: '#6b7280',
                              background: allSelected ? 'rgba(102, 126, 234, 0.1)' : '#e5e7eb',
                              padding: '2px 8px',
                              borderRadius: '9999px',
                              fontWeight: 500,
                            }}>
                              {selectedCount}/{categoryPerms.length}
                            </span>
                          </div>
                          <span style={{
                            transition: 'transform 0.3s',
                            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                            color: '#6b7280',
                            fontSize: '1rem',
                            marginLeft: '8px',
                          }}>
                            ▼
                          </span>
                        </div>
                        
                        {isExpanded && (
                          <div style={{
                            padding: '0.5rem',
                            background: 'white',
                          }}>
                            <div style={{ 
                              display: 'grid', 
                              gap: '4px',
                            }}>
                              {categoryPerms.map(permission => {
                                const isSelected = selectedPermissions.includes(permission.code);
                                return (
                                  <label
                                    key={permission.id}
                                    className="permission-item"
                                    style={{ 
                                      margin: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                      padding: '0.625rem 0.75rem',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s',
                                      background: isSelected 
                                        ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)'
                                        : 'transparent',
                                    }}
                                    onMouseEnter={(e) => {
                                      if (!isSelected) {
                                        e.currentTarget.style.background = '#f9fafb';
                                      }
                                    }}
                                    onMouseLeave={(e) => {
                                      if (!isSelected) {
                                        e.currentTarget.style.background = 'transparent';
                                      }
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handlePermissionToggle(permission.code)}
                                      className="permission-checkbox"
                                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <div className="permission-info" style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px',
                                        flexWrap: 'wrap',
                                      }}>
                                        <div className="permission-name" style={{ 
                                          fontWeight: 500, 
                                          color: isSelected ? '#4c51bf' : '#374151',
                                        }}>
                                          {permission.name}
                                        </div>
                                        {getPermissionTypeBadge(permission.permission_type)}
                                      </div>
                                      <div style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '8px',
                                        marginTop: '2px',
                                      }}>
                                        <div className="permission-code" style={{ fontSize: '0.75rem' }}>
                                          {permission.code}
                                        </div>
                                        {permission.description && (
                                          <div className="permission-desc" style={{ 
                                            fontSize: '0.75rem', 
                                            color: '#9ca3af',
                                          }}>
                                            {permission.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ 
              borderTop: '1px solid #e5e7eb', 
              paddingTop: '1rem', 
              marginTop: '0',
              flexShrink: 0,
            }}>
              <div style={{ marginRight: 'auto', color: '#6b7280', fontSize: '0.875rem' }}>
                已选择 <strong style={{ color: '#667eea' }}>{selectedPermissions.length}</strong> 个权限
                <span style={{ 
                  color: '#9ca3af', 
                  marginLeft: '4px',
                  fontSize: '0.8rem',
                }}>
                  / 共 {permissions.length} 个
                </span>
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
