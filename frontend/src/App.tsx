import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { RoleManagement } from './components/RoleManagement';
import { PermissionManagement } from './components/PermissionManagement';
import { ItineraryManagement } from './components/ItineraryManagement';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';
import './App.css';

type TabType = 'dashboard' | 'itinerary' | 'roles' | 'permissions';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  const { user, logout } = useAuth();
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

  return (
    <div className="app">
      <header className="app-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h1>🏖️ 智能旅游行程规划平台</h1>
            <p>AI 驱动的个性化旅游行程规划</p>
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
            className={`nav-tab ${activeTab === 'itinerary' ? 'active' : ''}`}
            onClick={() => setActiveTab('itinerary')}
          >
            🗺️ 行程规划
          </button>
          <button
            className={`nav-tab ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            🎭 角色管理
          </button>
          <button
            className={`nav-tab ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            🔐 权限管理
          </button>
        </nav>
      </header>
      
      <main className="app-main">
        <div className="container">
          {activeTab === 'dashboard' ? (
            <Dashboard />
          ) : activeTab === 'itinerary' ? (
            <ItineraryManagement />
          ) : activeTab === 'roles' ? (
            <RoleManagement />
          ) : (
            <PermissionManagement />
          )}
        </div>
      </main>
      
      <footer className="app-footer">
        <p>智能旅游行程规划平台 &copy; 2026</p>
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
