import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { RoleManagement } from './components/RoleManagement';
import { PermissionManagement } from './components/PermissionManagement';
import { ItineraryManagement } from './components/ItineraryManagement';
import { TenantManagement } from './components/TenantManagement';
import Dashboard from './components/Dashboard';
import DataInsights from './components/DataInsights';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import { useTenant } from './contexts/TenantContext';
import './App.css';

type TabType = 'dashboard' | 'insights' | 'itinerary' | 'roles' | 'permissions' | 'tenants' | 'profile';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  const { user, logout, hasPermission } = useAuth();
  const { currentTenant, loading: loadingTenant, refreshTenant } = useTenant();
  const navigate = useNavigate();

  const handleLogout = () => {
    console.log('[MainApp] 用户点击登出按钮');
    logout();
    navigate('/login');
  };

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

  const canManageTenants = hasPermission('sys:manage');

  return (
    <div className="app">
      <header className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {currentTenant && currentTenant.logo_url && (
              <img 
                src={currentTenant.logo_url} 
                alt={currentTenant.name}
                style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: '12px',
                  objectFit: 'contain',
                  background: 'white',
                  padding: '4px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            )}
            <div>
              <h1 style={{ 
                margin: 0, 
                fontSize: '1.75rem',
                fontWeight: 700,
                letterSpacing: '-0.02em'
              }}>
                {currentTenant ? currentTenant.name : (loadingTenant ? '加载中...' : '工作台')}
              </h1>
              {currentTenant && (
                <p style={{ 
                  margin: '0.25rem 0 0', 
                  fontSize: '0.95rem', 
                  opacity: 0.85,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ 
                    background: 'rgba(255,255,255,0.2)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}>
                    {currentTenant.code}
                  </span>
                  {currentTenant.description && (
                    <span style={{ opacity: 0.8 }}>
                      {currentTenant.description}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
          
          {user && (
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.15)', 
              padding: '0.75rem 1rem', 
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{ 
                width: '44px',
                height: '44px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: '1.1rem',
                cursor: 'pointer'
              }}
              onClick={() => setActiveTab('profile')}
              >
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600 }}>{user.username}</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  角色: {getRoleDisplayName(user.role_code)}
                </div>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                登出
              </button>
            </div>
          )}
        </div>
        
        <nav className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 数据面板
          </button>
          <button
            className={`nav-tab ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            📈 数据洞察
          </button>
          <button
            className={`nav-tab ${activeTab === 'itinerary' ? 'active' : ''}`}
            onClick={() => setActiveTab('itinerary')}
          >
            🗺️ 行程规划
          </button>
          <button
            className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            👤 个人中心
          </button>
          {canManageTenants && (
            <button
              className={`nav-tab ${activeTab === 'roles' ? 'active' : ''}`}
              onClick={() => setActiveTab('roles')}
            >
              🎭 角色管理
            </button>
          )}
          {canManageTenants && (
            <button
              className={`nav-tab ${activeTab === 'permissions' ? 'active' : ''}`}
              onClick={() => setActiveTab('permissions')}
            >
              🔐 权限管理
            </button>
          )}
          {canManageTenants && (
            <button
              className={`nav-tab ${activeTab === 'tenants' ? 'active' : ''}`}
              onClick={() => setActiveTab('tenants')}
            >
              🏢 租户管理
            </button>
          )}
        </nav>
      </header>
      
      <main className="app-main">
        <div className="container">
          {activeTab === 'dashboard' ? (
            <Dashboard />
          ) : activeTab === 'insights' ? (
            <DataInsights />
          ) : activeTab === 'itinerary' ? (
            <ItineraryManagement />
          ) : activeTab === 'profile' ? (
            <div style={{ padding: '1rem' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '2rem',
                borderRadius: '16px',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1.5rem'
              }}>
                <div style={{ 
                  width: '80px',
                  height: '80px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                  fontWeight: 700
                }}>
                  {user?.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
                    {user?.username}
                  </h2>
                  <p style={{ margin: '0.5rem 0 0', opacity: 0.9, fontSize: '0.95rem' }}>
                    角色: {user ? getRoleDisplayName(user.role_code) : '-'}
                  </p>
                  {currentTenant && (
                    <p style={{ margin: '0.25rem 0 0', opacity: 0.8, fontSize: '0.875rem' }}>
                      🏢 所属租户: {currentTenant.name} ({currentTenant.code})
                    </p>
                  )}
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ 
                  margin: '0 0 1rem 0', 
                  color: '#374151',
                  fontSize: '1.25rem',
                  fontWeight: 600
                }}>
                  📊 资源使用配额
                </h3>
                <div style={{ 
                  background: 'white',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}>
                  {loadingTenant ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                      {' '}加载配额信息中...
                    </div>
                  ) : currentTenant ? (
                    <>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>🗺️</span>
                            <span style={{ fontWeight: 600, color: '#374151' }}>行程数量配额</span>
                          </div>
                          <span style={{ 
                            fontSize: '0.875rem', 
                            color: currentTenant.itinerary_percentage >= 70 ? '#ef4444' : '#6b7280' 
                          }}>
                            {currentTenant.itinerary_used} / {currentTenant.itinerary_limit}
                            <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                              ({currentTenant.itinerary_percentage}%)
                            </span>
                          </span>
                        </div>
                        <div style={{ 
                          height: '16px', 
                          background: '#e5e7eb', 
                          borderRadius: '8px', 
                          overflow: 'hidden'
                        }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              background: currentTenant.itinerary_percentage >= 90 ? '#ef4444' :
                                        currentTenant.itinerary_percentage >= 70 ? '#f59e0b' : '#10b981',
                              width: `${Math.min(currentTenant.itinerary_percentage, 100)}%`,
                              transition: 'width 0.5s ease',
                              borderRadius: '8px'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                          <span style={{ color: '#6b7280' }}>已使用: {currentTenant.itinerary_used}</span>
                          <span style={{ color: '#10b981', fontWeight: 500 }}>剩余: {currentTenant.itinerary_remaining}</span>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '1.25rem' }}>🤖</span>
                            <span style={{ fontWeight: 600, color: '#374151' }}>AI调用次数配额</span>
                          </div>
                          <span style={{ 
                            fontSize: '0.875rem', 
                            color: currentTenant.ai_calls_percentage >= 70 ? '#ef4444' : '#6b7280' 
                          }}>
                            {currentTenant.ai_calls_used} / {currentTenant.ai_calls_limit}
                            <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>
                              ({currentTenant.ai_calls_percentage}%)
                            </span>
                          </span>
                        </div>
                        <div style={{ 
                          height: '16px', 
                          background: '#e5e7eb', 
                          borderRadius: '8px', 
                          overflow: 'hidden'
                        }}>
                          <div 
                            style={{ 
                              height: '100%', 
                              background: currentTenant.ai_calls_percentage >= 90 ? '#ef4444' :
                                        currentTenant.ai_calls_percentage >= 70 ? '#f59e0b' : '#10b981',
                              width: `${Math.min(currentTenant.ai_calls_percentage, 100)}%`,
                              transition: 'width 0.5s ease',
                              borderRadius: '8px'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                          <span style={{ color: '#6b7280' }}>已使用: {currentTenant.ai_calls_used}</span>
                          <span style={{ color: '#10b981', fontWeight: 500 }}>剩余: {currentTenant.ai_calls_remaining}</span>
                        </div>
                      </div>

                      {(currentTenant.itinerary_percentage >= 70 || currentTenant.ai_calls_percentage >= 70) && (
                        <div style={{ 
                          marginTop: '1.5rem',
                          padding: '1rem 1.25rem',
                          background: currentTenant.itinerary_percentage >= 90 || currentTenant.ai_calls_percentage >= 90 
                            ? '#fee2e2' 
                            : '#fef3c7',
                          borderRadius: '12px',
                          borderLeft: `4px solid ${
                            currentTenant.itinerary_percentage >= 90 || currentTenant.ai_calls_percentage >= 90 
                              ? '#ef4444' 
                              : '#f59e0b'
                          }`
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: '0.75rem'
                          }}>
                            <span style={{ fontSize: '1.25rem' }}>
                              {currentTenant.itinerary_percentage >= 90 || currentTenant.ai_calls_percentage >= 90 ? '🚨' : '⚠️'}
                            </span>
                            <div>
                              <div style={{ 
                                fontWeight: 600, 
                                color: currentTenant.itinerary_percentage >= 90 || currentTenant.ai_calls_percentage >= 90 
                                  ? '#dc2626' 
                                  : '#92400e',
                                marginBottom: '0.25rem'
                              }}>
                                配额预警
                              </div>
                              <div style={{ 
                                fontSize: '0.875rem',
                                color: currentTenant.itinerary_percentage >= 90 || currentTenant.ai_calls_percentage >= 90 
                                  ? '#991b1b' 
                                  : '#78350f',
                                lineHeight: 1.5
                              }}>
                                {currentTenant.itinerary_percentage >= 70 && (
                                  <span>行程数量已使用 {currentTenant.itinerary_percentage}%；</span>
                                )}
                                {currentTenant.ai_calls_percentage >= 70 && (
                                  <span>AI调用次数已使用 {currentTenant.ai_calls_percentage}%；</span>
                                )}
                                <span>请联系管理员提升配额。</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      无法获取租户信息
                    </div>
                  )}
                </div>
              </div>

              {user && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ 
                    margin: '0 0 1rem 0', 
                    color: '#374151',
                    fontSize: '1.25rem',
                    fontWeight: 600
                  }}>
                    🔐 我的权限
                  </h3>
                  <div style={{ 
                    background: 'white',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                  }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {user.permissions.map((perm, index) => (
                        <span 
                          key={index}
                          style={{ 
                            background: '#dbeafe', 
                            color: '#1d4ed8', 
                            padding: '0.5rem 1rem', 
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
              )}

              <div style={{ 
                background: '#f8fafc',
                borderRadius: '12px',
                padding: '1.5rem',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>💡</span>
                  <h4 style={{ margin: 0, color: '#374151', fontSize: '1rem', fontWeight: 600 }}>
                    如何提升配额？
                  </h4>
                </div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  如需提升资源配额，请联系系统管理员，说明您的业务需求和预期用量。管理员审核通过后将为您调整配额。
                </p>
              </div>
            </div>
          ) : activeTab === 'roles' ? (
            <RoleManagement />
          ) : activeTab === 'permissions' ? (
            <PermissionManagement />
          ) : activeTab === 'tenants' ? (
            <TenantManagement />
          ) : (
            <Dashboard />
          )}
        </div>
      </main>
      
      <footer className="app-footer">
        <p>
          {currentTenant ? `${currentTenant.name} | ` : ''}
          智能旅游行程规划平台 &copy; 2026
          {currentTenant ? ` | ${currentTenant.code}` : ''}
        </p>
      </footer>
    </div>
  );
};

function App() {
  console.log('[App] 渲染路由配置');
  
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainApp />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
