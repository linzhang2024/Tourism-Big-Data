import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, LoginRequest, LoginResponse } from '../types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true,
  });

  useEffect(() => {
    const initAuth = () => {
      console.log('[AuthContext] 初始化认证状态...');
      
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      
      if (storedToken && storedUser) {
        try {
          const user = JSON.parse(storedUser) as User;
          console.log(`[AuthContext] 从 localStorage 恢复用户: ${user.username}, 角色: ${user.role_code}`);
          
          setState({
            isAuthenticated: true,
            user,
            token: storedToken,
            loading: false,
          });
        } catch (error) {
          console.error('[AuthContext] 解析存储的用户信息失败:', error);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setState({
            isAuthenticated: false,
            user: null,
            token: null,
            loading: false,
          });
        }
      } else {
        console.log('[AuthContext] 未找到存储的认证信息');
        setState({
          isAuthenticated: false,
          user: null,
          token: null,
          loading: false,
        });
      }
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    console.log(`[AuthContext] 开始登录流程: 用户名='${username}'`);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password } as LoginRequest),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '登录失败' }));
        console.error(`[AuthContext] 登录请求失败: ${errorData.detail}`);
        return false;
      }

      const data: LoginResponse = await response.json();
      console.log(`[AuthContext] 登录成功: 用户='${data.user.username}', 角色='${data.user.role_code}'`);
      console.log(`[AuthContext] 收到 Token, 长度: ${data.access_token.length}`);

      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      console.log('[AuthContext] Token 和用户信息已保存到 localStorage');

      setState({
        isAuthenticated: true,
        user: data.user,
        token: data.access_token,
        loading: false,
      });

      console.log('[AuthContext] 认证状态已更新: isAuthenticated=true');
      return true;
    } catch (error) {
      console.error('[AuthContext] 登录过程中发生错误:', error);
      return false;
    }
  };

  const logout = () => {
    console.log('[AuthContext] 开始登出流程');
    
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    console.log('[AuthContext] 已从 localStorage 清除认证信息');

    setState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
    });

    console.log('[AuthContext] 认证状态已更新: isAuthenticated=false');
  };

  const refreshUser = async () => {
    console.log('[AuthContext] 开始刷新用户信息');
    
    if (!state.token) {
      console.warn('[AuthContext] 无法刷新用户信息: 没有 Token');
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${state.token}`,
        },
      });

      if (!response.ok) {
        console.error('[AuthContext] 刷新用户信息失败，Token 可能已过期');
        logout();
        return;
      }

      const user: User = await response.json();
      console.log(`[AuthContext] 用户信息刷新成功: ${user.username}`);

      localStorage.setItem(USER_KEY, JSON.stringify(user));
      
      setState(prev => ({
        ...prev,
        user,
      }));
    } catch (error) {
      console.error('[AuthContext] 刷新用户信息时发生错误:', error);
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
