import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { TenantWithQuota } from '../types';
import { getMyTenantInfo } from '../api';

interface TenantContextType {
  currentTenant: TenantWithQuota | null;
  loading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
  setCurrentTenant: (tenant: TenantWithQuota | null) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [currentTenant, setCurrentTenantState] = useState<TenantWithQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenantInfo = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[TenantContext] 开始获取租户信息...');
      
      const tenant = await getMyTenantInfo();
      console.log('[TenantContext] 租户信息获取成功:', tenant.name);
      
      setCurrentTenantState(tenant);
    } catch (err) {
      console.error('[TenantContext] 获取租户信息失败:', err);
      setError(err instanceof Error ? err.message : '获取租户信息失败');
    } finally {
      setLoading(false);
    }
  }, []);

  const setCurrentTenant = useCallback((tenant: TenantWithQuota | null) => {
    console.log('[TenantContext] 手动设置租户信息:', tenant?.name || 'null');
    setCurrentTenantState(tenant);
  }, []);

  const refreshTenant = useCallback(async () => {
    console.log('[TenantContext] 手动刷新租户信息');
    await fetchTenantInfo();
  }, [fetchTenantInfo]);

  useEffect(() => {
    fetchTenantInfo();
    
    const interval = setInterval(() => {
      fetchTenantInfo();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [fetchTenantInfo]);

  const value: TenantContextType = {
    currentTenant,
    loading,
    error,
    refreshTenant,
    setCurrentTenant,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};
