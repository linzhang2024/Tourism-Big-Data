import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Tenant } from '../types';
import { getTenants } from '../api';
import '../App.css';

type TabType = 'login' | 'register';

const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('login');
  
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regTenantId, setRegTenantId] = useState<number | ''>('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated) {
      console.log(`[LoginPage] 用户已登录，重定向到: ${from}`);
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  useEffect(() => {
    if (activeTab === 'register') {
      fetchTenants();
    }
  }, [activeTab]);

  const fetchTenants = async () => {
    setLoadingTenants(true);
    try {
      const data = await getTenants();
      setTenants(data.filter(t => t.is_active));
    } catch (err) {
      console.error('[LoginPage] 获取租户列表失败:', err);
    } finally {
      setLoadingTenants(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LoginPage] 提交登录表单');
    
    if (!loginUsername || !loginPassword) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    setError(null);

    console.log(`[LoginPage] 尝试登录: 用户名='${loginUsername}'`);

    const result = await login(loginUsername, loginPassword);

    setLoading(false);
    
    if (result.success) {
      console.log('[LoginPage] 登录成功，准备重定向');
    } else {
      console.log('[LoginPage] 登录失败:', result.error);
      setError(result.error || '登录失败');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[LoginPage] 提交注册表单');
    
    setError(null);
    setSuccess(null);

    if (!regUsername || !regPassword || !regConfirmPassword) {
      setError('请填写所有必填字段');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (regPassword.length < 6) {
      setError('密码长度至少为6位');
      return;
    }

    if (!regTenantId) {
      setError('请选择所属租户');
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        username: regUsername,
        password: regPassword,
        email: regEmail || undefined,
        tenant_id: Number(regTenantId)
      });

      if (result.success) {
        console.log('[LoginPage] 注册申请提交成功');
        setSuccess('注册申请已提交，请等待管理员审批。审批通过后即可登录。');
        setRegUsername('');
        setRegPassword('');
        setRegConfirmPassword('');
        setRegEmail('');
        setRegTenantId('');
      } else {
        setError(result.error || '注册失败');
      }
    } catch (err) {
      console.error('[LoginPage] 注册过程中发生错误:', err);
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setError(null);
    setSuccess(null);
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
            <div style={{ 
              display: 'flex', 
              marginBottom: '2rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <button
                type="button"
                onClick={() => handleTabChange('login')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  border: 'none',
                  background: 'none',
                  fontSize: '1rem',
                  fontWeight: activeTab === 'login' ? 600 : 400,
                  color: activeTab === 'login' ? '#667eea' : '#6b7280',
                  borderBottom: activeTab === 'login' ? '2px solid #667eea' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🔐 登录
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('register')}
                style={{
                  flex: 1,
                  padding: '1rem',
                  border: 'none',
                  background: 'none',
                  fontSize: '1rem',
                  fontWeight: activeTab === 'register' ? 600 : 400,
                  color: activeTab === 'register' ? '#667eea' : '#6b7280',
                  borderBottom: activeTab === 'register' ? '2px solid #667eea' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📝 注册
              </button>
            </div>

            {error && (
              <div className="error-message" style={{ marginBottom: '1.5rem' }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ 
                padding: '1rem', 
                background: '#d1fae5', 
                color: '#065f46', 
                borderRadius: '8px', 
                marginBottom: '1.5rem',
                border: '1px solid #6ee7b7'
              }}>
                ✅ {success}
              </div>
            )}

            {activeTab === 'login' ? (
              <form onSubmit={handleLoginSubmit}>
                <div className="form-group">
                  <label htmlFor="login-username">用户名</label>
                  <input
                    type="text"
                    id="login-username"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder="请输入用户名"
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="login-password">密码</label>
                  <input
                    type="password"
                    id="login-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
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
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit}>
                <div className="form-group">
                  <label htmlFor="reg-username">用户名 <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="text"
                    id="reg-username"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="请输入用户名"
                    disabled={loading}
                    autoComplete="username"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reg-email">邮箱</label>
                  <input
                    type="email"
                    id="reg-email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="请输入邮箱（选填）"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reg-tenant">所属租户 <span style={{ color: '#ef4444' }}>*</span></label>
                  {loadingTenants ? (
                    <div style={{ padding: '0.75rem', color: '#6b7280' }}>加载租户列表中...</div>
                  ) : (
                    <select
                      id="reg-tenant"
                      value={regTenantId}
                      onChange={(e) => setRegTenantId(e.target.value ? Number(e.target.value) : '')}
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        background: 'white'
                      }}
                    >
                      <option value="">请选择所属租户</option>
                      {tenants.map(tenant => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name} ({tenant.code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="reg-password">密码 <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="password"
                    id="reg-password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="请输入密码（至少6位）"
                    disabled={loading}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="reg-confirm-password">确认密码 <span style={{ color: '#ef4444' }}>*</span></label>
                  <input
                    type="password"
                    id="reg-confirm-password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="请再次输入密码"
                    disabled={loading}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div style={{ 
                  padding: '0.75rem', 
                  background: '#dbeafe', 
                  color: '#1e40af', 
                  borderRadius: '8px', 
                  marginBottom: '1.5rem',
                  fontSize: '0.875rem'
                }}>
                  💡 提示：注册后需要管理员审批才能登录。
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading}
                >
                  {loading ? '提交中...' : '提交注册申请'}
                </button>
              </form>
            )}
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
