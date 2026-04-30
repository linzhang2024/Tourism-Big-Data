import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getStats, exportStats, downloadFile, AnalysisParams } from '../api';
import { StatsResponse } from '../types';

const Dashboard: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  const availableDestinations = [
    '北京', '上海', '杭州', '成都', '西安',
    '重庆', '广州', '深圳', '苏州', '南京',
    '武汉', '长沙', '青岛', '大连', '厦门'
  ];
  
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        console.log('[Dashboard] 开始获取统计数据...');
        const data = await getStats();
        console.log('[Dashboard] 统计数据获取成功:', data);
        setStats(data);
      } catch (err) {
        console.error('[Dashboard] 获取统计数据失败:', err);
        setError(err instanceof Error ? err.message : '获取统计数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getRoleDisplayName = (roleCode: string) => {
    switch (roleCode) {
      case 'ADMIN':
        return '管理员';
      case 'USER':
        return '普通用户';
      default:
        return roleCode;
    }
  };

  const getAccessLevelDisplayName = (level: string) => {
    switch (level) {
      case 'admin':
        return '管理员级别（完整数据）';
      case 'detailed':
        return '详细级别（详细数据）';
      case 'basic':
        return '基础级别（基础数据）';
      default:
        return level;
    }
  };

  const handleExportReport = () => {
    console.log('[Dashboard] 点击导出报表按钮');
    setShowExportModal(true);
  };

  const handleDestinationToggle = (destination: string) => {
    setSelectedDestinations(prev => {
      if (prev.includes(destination)) {
        return prev.filter(d => d !== destination);
      } else {
        return [...prev, destination];
      }
    });
  };

  const handleExportSubmit = async () => {
    console.log('[Dashboard] 开始导出报表，格式:', exportFormat);
    setExporting(true);
    setError(null);

    try {
      const params: AnalysisParams & { format: 'json' | 'csv' } = {
        format: exportFormat
      };

      if (startDate) {
        params.start_date = startDate;
      }
      if (endDate) {
        params.end_date = endDate;
      }
      if (selectedDestinations.length > 0) {
        params.destination_categories = selectedDestinations;
      }

      console.log('[Dashboard] 导出参数:', params);

      const blob = await exportStats(params);
      
      const now = new Date();
      const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') + '_' +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');
      
      const filename = `itinerary_stats_${timestamp}.${exportFormat}`;
      
      downloadFile(blob, filename);
      
      setShowExportModal(false);
      alert('导出成功！文件已开始下载。');
      
    } catch (err) {
      console.error('[Dashboard] 导出失败:', err);
      const errorMessage = err instanceof Error ? err.message : '导出失败';
      setError(errorMessage);
      alert(`导出失败: ${errorMessage}`);
    } finally {
      setExporting(false);
    }
  };

  const handleRunSpider = () => {
    console.log('[Dashboard] 点击启动爬虫按钮');
    alert('启动爬虫功能：只有拥有 spider:run 权限的用户才能看到此按钮并执行此操作！');
  };

  const handleSystemManage = () => {
    console.log('[Dashboard] 点击系统管理按钮');
    alert('系统管理功能：只有拥有 sys:manage 权限的用户才能看到此按钮并执行此操作！');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        fontSize: '1.25rem',
        color: '#6b7280'
      }}>
        加载统计数据中...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ 
          background: '#fee2e2', 
          color: '#dc2626', 
          padding: '1rem', 
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          错误: {error}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '2rem',
        borderRadius: '12px',
        marginBottom: '2rem'
      }}>
        <h2 style={{ margin: 0, marginBottom: '0.5rem' }}>📊 数据面板</h2>
        <p style={{ margin: 0, opacity: 0.9 }}>系统数据概览 - 根据权限动态展示</p>
      </div>

      <div style={{ 
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: 0, marginBottom: '1rem', color: '#374151' }}>👤 当前用户信息</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>用户名</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937' }}>{user?.username}</div>
          </div>
          <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>角色</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937' }}>
              {user ? getRoleDisplayName(user.role_code) : '-'}
            </div>
          </div>
          <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>数据访问级别</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1f2937' }}>
              {stats ? getAccessLevelDisplayName(stats.access_level) : '-'}
            </div>
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>拥有的权限:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {user?.permissions.map((perm, index) => (
              <span 
                key={index}
                style={{ 
                  background: '#dbeafe', 
                  color: '#1d4ed8', 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                {perm}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ 
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: 0, marginBottom: '1rem', color: '#374151' }}>📈 统计数据</h3>
        
        {stats?.access_level === 'basic' && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ 
              background: '#fffbeb', 
              color: '#92400e', 
              padding: '0.75rem', 
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              ⚠️ 您当前只有基础数据访问权限（data:view），仅能查看基础统计数据。
            </div>
          </div>
        )}
        
        {stats?.access_level === 'detailed' && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ 
              background: '#ecfdf5', 
              color: '#065f46', 
              padding: '0.75rem', 
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              ✅ 您拥有详细数据访问权限（data:export），可以查看详细统计数据。
            </div>
          </div>
        )}
        
        {stats?.access_level === 'admin' && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ 
              background: '#f0fdf4', 
              color: '#166534', 
              padding: '0.75rem', 
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              🔐 您拥有管理员级别权限（sys:manage），可以查看完整统计数据。
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {stats?.stats.total_users !== undefined && (
            <div style={{ background: '#eff6ff', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1d4ed8' }}>{stats.stats.total_users}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>总用户数</div>
            </div>
          )}
          
          {stats?.stats.total_itineraries !== undefined && (
            <div style={{ background: '#fef3c7', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗺️</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#92400e' }}>{stats.stats.total_itineraries}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>总行程数</div>
            </div>
          )}
          
          {stats?.stats.total_cities !== undefined && (
            <div style={{ background: '#d1fae5', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏙️</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#065f46' }}>{stats.stats.total_cities}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>总城市数</div>
            </div>
          )}
          
          {stats?.stats.active_users_last_7_days !== undefined && (
            <div style={{ background: '#fce7f3', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔥</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#9d174d' }}>{stats.stats.active_users_last_7_days}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>7天活跃用户</div>
            </div>
          )}
          
          {stats?.stats.avg_itineraries_per_user !== undefined && (
            <div style={{ background: '#e0e7ff', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3730a3' }}>{stats.stats.avg_itineraries_per_user}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>平均每用户行程</div>
            </div>
          )}
          
          {stats?.stats.total_permissions !== undefined && (
            <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔐</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#075985' }}>{stats.stats.total_permissions}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>总权限数</div>
            </div>
          )}
          
          {stats?.stats.total_roles !== undefined && (
            <div style={{ background: '#faf5ff', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎭</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#6b21a8' }}>{stats.stats.total_roles}</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>总角色数</div>
            </div>
          )}
        </div>

        {stats?.stats.top_destinations && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ margin: 0, marginBottom: '0.75rem', color: '#374151' }}>🏆 热门目的地</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {stats.stats.top_destinations.map((city: string, index: number) => (
                <span 
                  key={index}
                  style={{ 
                    background: '#f3f4f6', 
                    color: '#374151', 
                    padding: '0.5rem 1rem', 
                    borderRadius: '8px',
                    fontWeight: 500
                  }}
                >
                  {index + 1}. {city}
                </span>
              ))}
            </div>
          </div>
        )}

        {stats?.stats.recent_logins && (
          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ margin: 0, marginBottom: '0.75rem', color: '#374151' }}>🕐 最近登录记录</h4>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>用户名</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>登录时间</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>IP地址</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.stats.recent_logins.map((login: any, index: number) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '0.75rem' }}>{login.username}</td>
                      <td style={{ padding: '0.75rem' }}>{login.login_time}</td>
                      <td style={{ padding: '0.75rem' }}>{login.ip}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div style={{ 
        background: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ margin: 0, marginBottom: '1rem', color: '#374151' }}>🎯 操作按钮（权限感知）</h3>
        <p style={{ margin: 0, marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
          以下按钮会根据用户权限动态显示/隐藏。只有拥有相应权限的用户才能看到并操作对应按钮。
        </p>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {hasPermission('data:export') && (
            <button
              onClick={handleExportReport}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#059669';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#10b981';
              }}
            >
              📥 导出报表
              <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.2)', padding: '0.125rem 0.5rem', borderRadius: '4px' }}>
                需要 data:export
              </span>
            </button>
          )}
          
          {hasPermission('spider:run') && (
            <button
              onClick={handleRunSpider}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#d97706';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f59e0b';
              }}
            >
              🕷️ 启动爬虫
              <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.2)', padding: '0.125rem 0.5rem', borderRadius: '4px' }}>
                需要 spider:run
              </span>
            </button>
          )}
          
          {hasPermission('sys:manage') && (
            <button
              onClick={handleSystemManage}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#7c3aed';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#8b5cf6';
              }}
            >
              ⚙️ 系统管理
              <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.2)', padding: '0.125rem 0.5rem', borderRadius: '4px' }}>
                需要 sys:manage
              </span>
            </button>
          )}
        </div>

        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>💡 权限说明:</div>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.875rem', color: '#4b5563' }}>
            <li><strong>data:view</strong> - 基础数据查看权限（所有用户都有）</li>
            <li><strong>data:export</strong> - 数据导出权限（仅管理员有）</li>
            <li><strong>spider:run</strong> - 启动爬虫权限（仅管理员有）</li>
            <li><strong>sys:manage</strong> - 系统管理权限（仅管理员有）</li>
          </ul>
        </div>
      </div>

      {showExportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowExportModal(false);
            }
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <h3 style={{ margin: 0, marginBottom: '1.5rem', color: '#1f2937' }}>
              📥 导出报表
            </h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '0.5rem', color: '#374151', fontWeight: 500 }}>
                导出格式:
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: exportFormat === 'json' ? '#dbeafe' : '#f3f4f6',
                    border: exportFormat === 'json' ? '2px solid #3b82f6' : '2px solid transparent'
                  }}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value="json"
                    checked={exportFormat === 'json'}
                    onChange={() => setExportFormat('json')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>JSON</span>
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    cursor: 'pointer',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    background: exportFormat === 'csv' ? '#dbeafe' : '#f3f4f6',
                    border: exportFormat === 'csv' ? '2px solid #3b82f6' : '2px solid transparent'
                  }}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={() => setExportFormat('csv')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>CSV (Excel可打开)</span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '0.5rem', color: '#374151', fontWeight: 500 }}>
                日期筛选 (可选，格式: YYYY-MM):
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    开始日期
                  </div>
                  <input
                    type="month"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    结束日期
                  </div>
                  <input
                    type="month"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ marginBottom: '0.5rem', color: '#374151', fontWeight: 500 }}>
                目的地筛选 (可选，不选则导出全部):
              </div>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '0.5rem',
                maxHeight: '150px',
                overflowY: 'auto',
                padding: '0.5rem',
                background: '#f9fafb',
                borderRadius: '8px'
              }}>
                {availableDestinations.map((dest) => (
                  <label
                    key={dest}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer',
                      padding: '0.375rem 0.75rem',
                      borderRadius: '6px',
                      background: selectedDestinations.includes(dest) ? '#dbeafe' : 'white',
                      border: selectedDestinations.includes(dest) ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                      fontSize: '0.875rem'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDestinations.includes(dest)}
                      onChange={() => handleDestinationToggle(dest)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>{dest}</span>
                  </label>
                ))}
              </div>
              {selectedDestinations.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                  已选择 {selectedDestinations.length} 个目的地
                </div>
              )}
            </div>

            {error && (
              <div style={{
                padding: '0.75rem 1rem',
                background: '#fee2e2',
                color: '#dc2626',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.875rem'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setError(null);
                }}
                disabled={exporting}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 500,
                  cursor: exporting ? 'not-allowed' : 'pointer',
                  opacity: exporting ? 0.6 : 1
                }}
              >
                取消
              </button>
              <button
                onClick={handleExportSubmit}
                disabled={exporting}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: exporting ? 'not-allowed' : 'pointer',
                  opacity: exporting ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {exporting ? (
                  <>
                    <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                    导出中...
                  </>
                ) : (
                  <>
                    📥 确认导出
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;