import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../App.css';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      console.log(`[LoginPage] 用户已登录，重定向到: ${from}`);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LoginPage] 提交登录表单');
    
    if (!username || !password) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    setError(null);

    console.log(`[LoginPage] 尝试登录: 用户名='${username}'`);

    const success = await login(username, password);

    if (success) {
      console.log('[LoginPage] 登录成功，准备重定向');
      setLoading(false);
    } else {
      console.log('[LoginPage] 登录失败');
      setError('用户名或密码错误');
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🏖️ 智能旅游行程规划平台</h1>
        <p>AI 驱动的个性化旅游行程规划</p>
      </header>

      <main className="app-main">
        <div className="container" style={{ maxWidth: '450px' }}>
          <div className="form-card">
            <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>
              🔐 用户登录
            </h2>

            {error && (
              <div className="error-message" style={{ marginBottom: '1.5rem' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username">用户名</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  disabled={loading}
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">密码</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                className="submit-btn"
                disabled={loading}
              >
                {loading ? '登录中...' : '登 录'}
              </button>
            </form>

            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
              <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '1rem', fontSize: '0.875rem' }}>
                测试账号：
              </p>
              <div style={{ 
                background: '#f9fafb', 
                padding: '1rem', 
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>管理员：</strong> admin / admin123
                </div>
                <div>
                  <strong>普通用户：</strong> user / user123
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>智能旅游行程规划平台 &copy; 2026</p>
      </footer>
    </div>
  );
};

export default LoginPage;
