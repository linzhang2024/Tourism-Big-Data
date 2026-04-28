import React, { useState, useEffect } from 'react';
import { PermissionResponse } from '../types';
import { getPermissions } from '../api';

export const PermissionManagement: React.FC = () => {
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <div className="permission-management">
      <div className="form-card">
        <div className="card-header">
          <h2>🔐 权限管理</h2>
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
            <table className="permission-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>权限名称</th>
                  <th>权限代码</th>
                  <th>描述</th>
                  <th>创建时间</th>
                </tr>
              </thead>
              <tbody>
                {permissions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-row">
                      暂无权限数据
                    </td>
                  </tr>
                ) : (
                  permissions.map(permission => (
                    <tr key={permission.id}>
                      <td>{permission.id}</td>
                      <td className="permission-name">{permission.name}</td>
                      <td>
                        <span className="permission-code">{permission.code}</span>
                      </td>
                      <td className="permission-desc">{permission.description || '-'}</td>
                      <td className="date-cell">{formatDate(permission.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
