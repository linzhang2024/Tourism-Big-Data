import React, { useState, useEffect } from 'react';
import { PermissionResponse, PermissionCategory } from '../types';
import { getPermissions } from '../api';

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

export const PermissionManagement: React.FC = () => {
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PermissionCategory | 'all'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<PermissionCategory>>(
    new Set(CATEGORY_ORDER)
  );

  const fetchPermissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPermissions();
      setPermissions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取权限列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, []);

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

  const filteredPermissions = selectedCategory === 'all'
    ? permissions
    : permissions.filter(p => p.category === selectedCategory);

  const groupedPermissions = groupPermissionsByCategory(filteredPermissions);

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

  const expandAll = () => {
    setExpandedCategories(new Set(CATEGORY_ORDER));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const getPermissionTypeBadge = (type: string) => {
    if (type === 'menu') {
      return (
        <span className="permission-badge" style={{
          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
          color: '#1d4ed8',
          padding: '2px 10px',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 500,
        }}>
          菜单权限
        </span>
      );
    }
    return (
      <span className="permission-badge" style={{
        background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
        color: '#15803d',
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 500,
      }}>
        数据权限
      </span>
    );
  };

  const categoriesToShow = CATEGORY_ORDER.filter(cat => groupedPermissions[cat]?.length > 0);

  return (
    <div className="permission-management">
      <div className="form-card">
        <div className="card-header" style={{ marginBottom: '1rem' }}>
          <h2>🔐 权限管理</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={expandAll}
              style={{
                padding: '6px 12px',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#374151',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
              }}
            >
              展开全部
            </button>
            <button
              type="button"
              onClick={collapseAll}
              style={{
                padding: '6px 12px',
                background: '#f3f4f6',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#374151',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e5e7eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
              }}
            >
              收起全部
            </button>
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '1.5rem',
          padding: '0.75rem',
          background: '#f9fafb',
          borderRadius: '8px',
          flexWrap: 'wrap',
        }}>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: selectedCategory === 'all' ? 600 : 400,
              background: selectedCategory === 'all'
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'white',
              color: selectedCategory === 'all' ? 'white' : '#374151',
              transition: 'all 0.2s',
              boxShadow: selectedCategory === 'all'
                ? '0 4px 14px rgba(102, 126, 234, 0.4)'
                : '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            全部 ({permissions.length})
          </button>
          {CATEGORY_ORDER.map(cat => {
            const count = permissions.filter(p => p.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: selectedCategory === cat ? 600 : 400,
                  background: selectedCategory === cat
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : 'white',
                  color: selectedCategory === cat ? 'white' : '#374151',
                  transition: 'all 0.2s',
                  boxShadow: selectedCategory === cat
                    ? '0 4px 14px rgba(102, 126, 234, 0.4)'
                    : '0 1px 3px rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                <span>{cat}</span>
                <span style={{
                  fontSize: '0.75rem',
                  opacity: 0.8,
                  marginLeft: '2px',
                }}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="loading">加载中...</div>
        ) : categoriesToShow.length === 0 ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '1rem',
          }}>
            暂无权限数据
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {categoriesToShow.map(category => {
              const perms = groupedPermissions[category];
              const isExpanded = expandedCategories.has(category);
              
              return (
                <div
                  key={category}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                  }}
                >
                  <div
                    onClick={() => toggleCategory(category)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.25rem',
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                      cursor: 'pointer',
                      userSelect: 'none',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '1.25rem' }}>
                        {CATEGORY_ICONS[category]}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, color: '#374151', fontSize: '1rem' }}>
                          {category}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          共 {perms.length} 个权限
                        </div>
                      </div>
                    </div>
                    <span style={{
                      transition: 'transform 0.3s',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      color: '#6b7280',
                      fontSize: '1.25rem',
                    }}>
                      ▼
                    </span>
                  </div>
                  
                  {isExpanded && (
                    <div style={{
                      overflow: 'hidden',
                      animation: 'slideDown 0.3s ease-out',
                    }}>
                      <div className="table-container" style={{ margin: 0, borderRadius: 0 }}>
                        <table className="permission-table" style={{ margin: 0 }}>
                          <thead>
                            <tr>
                              <th style={{ width: '80px' }}>ID</th>
                              <th>权限名称</th>
                              <th style={{ width: '120px' }}>权限代码</th>
                              <th style={{ width: '100px' }}>类型</th>
                              <th>描述</th>
                              <th style={{ width: '160px' }}>创建时间</th>
                            </tr>
                          </thead>
                          <tbody>
                            {perms.map(permission => (
                              <tr key={permission.id}>
                                <td>{permission.id}</td>
                                <td className="permission-name">{permission.name}</td>
                                <td>
                                  <span className="permission-code">{permission.code}</span>
                                </td>
                                <td>
                                  {getPermissionTypeBadge(permission.permission_type)}
                                </td>
                                <td className="permission-desc">{permission.description || '-'}</td>
                                <td className="date-cell">{formatDate(permission.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
