import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  console.log(`[ProtectedRoute] 检查访问权限: isAuthenticated=${isAuthenticated}, loading=${loading}`);
  console.log(`[ProtectedRoute] 当前路径: ${location.pathname}`);

  if (loading) {
    console.log('[ProtectedRoute] 正在加载认证状态...');
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '1.25rem',
        color: '#6b7280'
      }}>
        加载中...
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log(`[ProtectedRoute] 用户未登录，重定向到登录页，原路径: ${location.pathname}`);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('[ProtectedRoute] 用户已认证，允许访问');
  return <>{children}</>;
};

export default ProtectedRoute;
