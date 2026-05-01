import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { RoleManagement } from './components/RoleManagement';
import { PermissionManagement } from './components/PermissionManagement';
import { ItineraryManagement } from './components/ItineraryManagement';
import { TenantManagement } from './components/TenantManagement';
import Dashboard from './components/Dashboard';
import QuotaDashboard from './components/QuotaDashboard';
import DataInsights from './components/DataInsights';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import { getMyTenantInfo } from './api';
import { TenantWithQuota } from './types';
import './App.css';

type TabType = 'dashboard' | 'insights' | 'itinerary' | 'roles' | 'permissions' | 'tenants';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [currentTenant, setCurrentTenant] = useState<TenantWithQuota | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(true);
  
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTenantInfo = async () => {
      try {
        setLoadingTenant(true);
        const tenant = await getMyTenantInfo();
        setCurrentTenant(tenant);
      } catch (err) {
        console.error('获取租户信息失败:', err);
      } finally {
        setLoadingTenant(false);
      }
    };
    
    fetchTenantInfo();
    const interval = setInterval(fetchTenantInfo, 60000);
    return () => clearInterval(interval);
  }, []);

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
                  width: '48px', 
                  height: '48px', 
                  borderRadius: '8px',
                  objectFit: 'contain',
                  background: 'white',
                  padding: '4px'
                }}
              />
            )}
            <div>
              <h1 style={{ margin: 0 }}>
                🏖️ {currentTenant ? `${currentTenant.name} - ` : ''}智能旅游行程规划平台
              </h1>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', opacity: 0.9 }}>
                {currentTenant ? `${currentTenant.code} | ` : ''}AI 驱动的个性化旅游行程规划
              </p>
            </div>
          </div>
          
          {user && (
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.15)', 
              padding: '0.75rem 1rem', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600 }}>{user.username}</div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                  角色: {getRoleDisplayName(user.role_code)}
                </div>
                {currentTenant && (
                  <div style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '0.25rem' }}>
                    🏢 {currentTenant.name}
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
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
            <>
              <QuotaDashboard />
              <Dashboard />
            </>
          ) : activeTab === 'insights' ? (
            <DataInsights />
          ) : activeTab === 'itinerary' ? (
            <ItineraryManagement />
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
          {currentTenant ? `${currentTenant.name} - ` : ''}
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
