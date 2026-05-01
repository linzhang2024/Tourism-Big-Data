import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, LoginRequest, LoginResponse, RegisterRequest } from '../types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface LoginResult {
  success: boolean;
  error?: string;
  errorCode?: 'PENDING' | 'REJECTED' | 'INVALID_CREDENTIALS' | 'UNKNOWN';
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<LoginResult>;
  register: (request: RegisterRequest) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
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
          console.log(`[AuthContext] 从 localStorage 恢复用户: ${user.username}, 角色: ${user.role_code}, 权限: ${user.permissions}`);
          
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

  const login = async (username: string, password: string): Promise<LoginResult> => {
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
        const errorMessage = errorData.detail || '登录失败';
        console.error(`[AuthContext] 登录请求失败: ${errorMessage}`);
        
        let errorCode: LoginResult['errorCode'] = 'UNKNOWN';
        if (response.status === 403) {
          if (errorMessage.includes('待审核')) {
            errorCode = 'PENDING';
          } else if (errorMessage.includes('拒绝')) {
            errorCode = 'REJECTED';
          }
        } else if (response.status === 401) {
          errorCode = 'INVALID_CREDENTIALS';
        }
        
        return {
          success: false,
          error: errorMessage,
          errorCode
        };
      }

      const data: LoginResponse = await response.json();
      console.log(`[AuthContext] 登录成功: 用户='${data.user.username}', 角色='${data.user.role_code}', 权限='${data.user.permissions}'`);
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
      return { success: true };
    } catch (error) {
      console.error('[AuthContext] 登录过程中发生错误:', error);
      return {
        success: false,
        error: '登录过程中发生错误',
        errorCode: 'UNKNOWN'
      };
    }
  };

  const register = async (request: RegisterRequest): Promise<{ success: boolean; error?: string }> => {
    console.log(`[AuthContext] 开始注册流程: 用户名='${request.username}'`);
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '注册失败' }));
        const errorMessage = errorData.detail || '注册失败';
        console.error(`[AuthContext] 注册请求失败: ${errorMessage}`);
        return { success: false, error: errorMessage };
      }

      const data = await response.json();
      console.log(`[AuthContext] 注册申请提交成功: 用户='${data.username}', 状态='${data.status}'`);
      return { success: true };
    } catch (error) {
      console.error('[AuthContext] 注册过程中发生错误:', error);
      return { success: false, error: '注册过程中发生错误' };
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
      console.log(`[AuthContext] 用户信息刷新成功: ${user.username}, 权限: ${user.permissions}`);

      localStorage.setItem(USER_KEY, JSON.stringify(user));
      
      setState(prev => ({
        ...prev,
        user,
      }));
    } catch (error) {
      console.error('[AuthContext] 刷新用户信息时发生错误:', error);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!state.user || !state.user.permissions) {
      console.log(`[AuthContext] hasPermission 检查: 用户未登录或没有权限列表，权限 '${permission}' 不通过`);
      return false;
    }
    const hasIt = state.user.permissions.includes(permission);
    console.log(`[AuthContext] hasPermission 检查: 权限 '${permission}' ${hasIt ? '通过' : '不通过'}`);
    return hasIt;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!state.user || !state.user.permissions) {
      console.log(`[AuthContext] hasAnyPermission 检查: 用户未登录或没有权限列表，权限列表 ${permissions} 不通过`);
      return false;
    }
    const hasAny = permissions.some(p => state.user!.permissions.includes(p));
    console.log(`[AuthContext] hasAnyPermission 检查: 权限列表 ${permissions} ${hasAny ? '通过' : '不通过'}`);
    return hasAny;
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!state.user || !state.user.permissions) {
      console.log(`[AuthContext] hasAllPermissions 检查: 用户未登录或没有权限列表，权限列表 ${permissions} 不通过`);
      return false;
    }
    const hasAll = permissions.every(p => state.user!.permissions.includes(p));
    console.log(`[AuthContext] hasAllPermissions 检查: 权限列表 ${permissions} ${hasAll ? '通过' : '不通过'}`);
    return hasAll;
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshUser,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
