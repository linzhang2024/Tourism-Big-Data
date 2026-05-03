import React, { useState, useEffect } from 'react';
import { Tenant, TenantCreate, TenantUpdate, TenantWithQuota, User, RoleResponse, PermissionCategory, PermissionResponse, TenantCloneRequest, TenantCloneResponse } from '../types';
import { getTenants, createTenant, updateTenant, deleteTenant, getTenantById, resetTenantQuota, getPendingUsers, getRejectedUsers, approveUser, rejectUser, getRoles, updateTenantRoles, cloneTenant } from '../api';
import { useTenant } from '../contexts/TenantContext';
import { useToast } from '../contexts/ToastContext';

type TabType = 'tenants' | 'pending' | 'rejected';

const getPercentageColor = (percentage: number) => {
  if (percentage >= 90) return '#ef4444';
  if (percentage >= 70) return '#f59e0b';
  return '#10b981';
};

const getResourceUsedClass = (percentage: number) => {
  if (percentage >= 90) return 'resource-used-high';
  if (percentage >= 70) return 'resource-used-medium';
  return 'resource-used-low';
};

const CircularProgress: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  label?: string;
}> = ({ percentage, size = 48, strokeWidth = 6, showLabel = true, label }) => {
  const color = getPercentageColor(percentage);
  const displayPercentage = Math.min(percentage, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayPercentage / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      {showLabel && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.6rem',
          fontWeight: 700,
          color: color
        }}>
          {label || `${displayPercentage.toFixed(0)}%`}
        </div>
      )}
    </div>
  );
};

const CATEGORY_ICONS: Record<PermissionCategory, string> = {
  '系统管理': '⚙️',
  '行程业务': '🗺️',
  '菜单可见性': '📋',
  '数据操作': '📊',
  '爬虫管理': '🕷️',
};

const CATEGORY_ORDER: PermissionCategory[] = [
  '系统管理',
  '行程业务',
  '菜单可见性',
  '数据操作',
  '爬虫管理',
];

const groupPermissionsByCategory = (perms: PermissionResponse[]): Record<PermissionCategory, PermissionResponse[]> => {
  const grouped: Record<string, PermissionResponse[]> = {};
  perms.forEach(perm => {
    if (!grouped[perm.category]) {
      grouped[perm.category] = [];
    }
    grouped[perm.category].push(perm);
  });
  return grouped as Record<PermissionCategory, PermissionResponse[]>;
};

export const TenantManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('tenants');
  
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  
  const [expandedRoleCodes, setExpandedRoleCodes] = useState<Set<string>>(new Set());
  const [expandedMenuId, setExpandedMenuId] = useState<number | null>(null);
  
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  
  const [rejectedUsers, setRejectedUsers] = useState<User[]>([]);
  const [loadingRejected, setLoadingRejected] = useState(false);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantWithQuota | null>(null);
  const [selectedPendingUser, setSelectedPendingUser] = useState<User | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  
  const [createFormData, setCreateFormData] = useState<TenantCreate>({
    name: '',
    code: '',
    description: '',
    logo_url: '',
    itinerary_limit: 100,
    ai_calls_limit: 50,
    allowed_role_codes: [],
  });
  const [editFormData, setEditFormData] = useState<TenantUpdate>({});
  const [cloneFormData, setCloneFormData] = useState<TenantCloneRequest>({
    name: '',
    code: '',
    clone_roles: true,
    clone_permissions: true,
    clone_config: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [selectedTenantIds, setSelectedTenantIds] = useState<Set<number>>(new Set());
  const [showBatchDisableModal, setShowBatchDisableModal] = useState(false);
  const [showBatchEnableModal, setShowBatchEnableModal] = useState(false);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [updatedTenantIds, setUpdatedTenantIds] = useState<Set<number>>(new Set());

  const { currentTenant, refreshTenant } = useTenant();
  const toast = useToast();

  const fetchTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTenants();
      setTenants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取租户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(tenants.map(t => t.id));
      setSelectedTenantIds(allIds);
    } else {
      setSelectedTenantIds(new Set());
    }
  };

  const handleSelectTenant = (tenantId: number, checked: boolean) => {
    setSelectedTenantIds(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(tenantId);
      } else {
        newSet.delete(tenantId);
      }
      return newSet;
    });
  };

  const isAllSelected = tenants.length > 0 && selectedTenantIds.size === tenants.length;
  const isSomeSelected = selectedTenantIds.size > 0 && selectedTenantIds.size < tenants.length;

  const getSelectedTenants = () => {
    return tenants.filter(t => selectedTenantIds.has(t.id));
  };

  const handleBatchDisable = async () => {
    const selectedTenants = getSelectedTenants();
    const activeTenants = selectedTenants.filter(t => t.is_active);
    
    if (activeTenants.length === 0) {
      toast.warning('所选租户均已处于禁用状态', '无需操作');
      return;
    }

    setSubmitting(true);
    let successCount = 0;
    const failedIds: number[] = [];
    const successfullyUpdatedIds: number[] = [];

    try {
      for (const tenant of activeTenants) {
        try {
          await updateTenant(tenant.id, { is_active: false });
          successCount++;
          successfullyUpdatedIds.push(tenant.id);
          setUpdatedTenantIds(prev => new Set([...prev, tenant.id]));
          
          setTenants(prevTenants => 
            prevTenants.map(t => 
              t.id === tenant.id 
                ? { ...t, is_active: false } 
                : t
            )
          );
        } catch (err) {
          console.error(`禁用租户 ${tenant.name} 失败:`, err);
          failedIds.push(tenant.id);
        }
      }

      setTimeout(() => {
        setUpdatedTenantIds(new Set());
      }, 1000);

      if (successCount > 0) {
        toast.success(`成功禁用 ${successCount} 个租户`, '批量禁用成功');
      }
      if (failedIds.length > 0) {
        toast.error(`禁用 ${failedIds.length} 个租户失败`, '批量禁用部分失败');
      }

      await fetchTenants();
    } catch (err) {
      console.error('批量禁用失败:', err);
      toast.error('批量禁用操作失败', '操作失败');
    } finally {
      setSubmitting(false);
      setShowBatchDisableModal(false);
    }
  };

  const handleBatchEnable = async () => {
    const selectedTenants = getSelectedTenants();
    const inactiveTenants = selectedTenants.filter(t => !t.is_active);
    
    if (inactiveTenants.length === 0) {
      toast.warning('所选租户均已处于启用状态', '无需操作');
      return;
    }

    setSubmitting(true);
    let successCount = 0;
    const failedIds: number[] = [];

    try {
      for (const tenant of inactiveTenants) {
        try {
          await updateTenant(tenant.id, { is_active: true });
          successCount++;
          setUpdatedTenantIds(prev => new Set([...prev, tenant.id]));
          
          setTenants(prevTenants => 
            prevTenants.map(t => 
              t.id === tenant.id 
                ? { ...t, is_active: true } 
                : t
            )
          );
        } catch (err) {
          console.error(`启用租户 ${tenant.name} 失败:`, err);
          failedIds.push(tenant.id);
        }
      }

      setTimeout(() => {
        setUpdatedTenantIds(new Set());
      }, 1000);

      if (successCount > 0) {
        toast.success(`成功启用 ${successCount} 个租户`, '批量启用成功');
      }
      if (failedIds.length > 0) {
        toast.error(`启用 ${failedIds.length} 个租户失败`, '批量启用部分失败');
      }

      await fetchTenants();
    } catch (err) {
      console.error('批量启用失败:', err);
      toast.error('批量启用操作失败', '操作失败');
    } finally {
      setSubmitting(false);
      setShowBatchEnableModal(false);
    }
  };

  const handleBatchDelete = async () => {
    const selectedTenants = getSelectedTenants();
    
    if (selectedTenants.length === 0) {
      toast.warning('请先选择要删除的租户', '未选择租户');
      return;
    }

    setSubmitting(true);
    let successCount = 0;
    const failedIds: number[] = [];
    const successfullyDeletedIds: number[] = [];

    try {
      for (const tenant of selectedTenants) {
        try {
          await deleteTenant(tenant.id);
          successCount++;
          successfullyDeletedIds.push(tenant.id);
          
          setTenants(prevTenants => 
            prevTenants.filter(t => t.id !== tenant.id)
          );
          
          setSelectedTenantIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(tenant.id);
            return newSet;
          });
        } catch (err) {
          console.error(`删除租户 ${tenant.name} 失败:`, err);
          failedIds.push(tenant.id);
        }
      }

      if (successCount > 0) {
        toast.success(`成功删除 ${successCount} 个租户`, '批量删除成功');
      }
      if (failedIds.length > 0) {
        toast.error(`删除 ${failedIds.length} 个租户失败`, '批量删除部分失败');
      }

      await fetchTenants();
    } catch (err) {
      console.error('批量删除失败:', err);
      toast.error('批量删除操作失败', '操作失败');
    } finally {
      setSubmitting(false);
      setShowBatchDeleteModal(false);
    }
  };

  const fetchPendingUsers = async () => {
    setLoadingPending(true);
    try {
      const data = await getPendingUsers();
      setPendingUsers(data);
      console.log('[TenantManagement] 获取待审核用户:', data);
    } catch (err) {
      console.error('[TenantManagement] 获取待审核用户失败:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  const fetchRejectedUsers = async () => {
    setLoadingRejected(true);
    try {
      const data = await getRejectedUsers();
      setRejectedUsers(data);
    } catch (err) {
      console.error('[TenantManagement] 获取已驳回用户失败:', err);
    } finally {
      setLoadingRejected(false);
    }
  };

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const data = await getRoles();
      setRoles(data);
    } catch (err) {
      console.error('[TenantManagement] 获取角色列表失败:', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchRoles();
  }, []);

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingUsers();
    } else if (activeTab === 'rejected') {
      fetchRejectedUsers();
    }
  }, [activeTab]);

  useEffect(() => {
    const handleClickOutside = (_e: MouseEvent) => {
      if (expandedMenuId !== null) {
        setExpandedMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [expandedMenuId]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setError(null);
  };

  const getTenantName = (tenantId?: number): string => {
    if (!tenantId) return '未知租户';
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant ? `${tenant.name} (${tenant.code})` : `租户ID: ${tenantId}`;
  };

  const handleCreateInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCreateFormData(prev => ({ 
      ...prev, 
      [name]: name === 'itinerary_limit' || name === 'ai_calls_limit' 
        ? parseInt(value) || 0 
        : value 
    }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setEditFormData(prev => ({ 
        ...prev, 
        [name]: name === 'itinerary_limit' || name === 'ai_calls_limit' 
          ? parseInt(value) || 0 
          : value 
      }));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await createTenant(createFormData);
      setShowCreateModal(false);
      setCreateFormData({
        name: '',
        code: '',
        description: '',
        logo_url: '',
        itinerary_limit: 100,
        ai_calls_limit: 50,
      });
      fetchTenants();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '创建租户失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    
    setFormError(null);
    setSubmitting(true);

    try {
      console.log('='.repeat(60));
      console.log('[TenantManagement] 开始保存租户编辑');
      console.log(`[TenantManagement] 租户ID: ${selectedTenant.id}, 名称: ${selectedTenant.name}`);
      console.log(`[TenantManagement] 当前选择的角色: ${editFormData.allowed_role_codes || []}`);
      console.log('='.repeat(60));
      
      const { allowed_role_codes, ...otherFields } = editFormData;
      
      console.log('[TenantManagement] 步骤1: 更新租户基础信息');
      await updateTenant(selectedTenant.id, otherFields);
      console.log('[TenantManagement] 租户基础信息更新成功');
      
      if (allowed_role_codes !== undefined) {
        console.log('[TenantManagement] 步骤2: 保存角色授权');
        console.log(`[TenantManagement] 即将保存的角色列表: ${allowed_role_codes}`);
        console.log(`[TenantManagement] 调用专门接口: PUT /api/tenants/${selectedTenant.id}/roles`);
        
        await updateTenantRoles(selectedTenant.id, allowed_role_codes);
        
        console.log('[TenantManagement] ✅ 角色授权保存成功');
        console.log(`[TenantManagement] 保存的角色: ${allowed_role_codes}`);
      } else {
        console.log('[TenantManagement] 步骤2: 跳过角色授权保存（allowed_role_codes 为 undefined）');
      }
      
      setShowEditModal(false);
      
      await fetchTenants();
      
      try {
        const updatedDetail = await getTenantById(selectedTenant.id);
        setSelectedTenant(updatedDetail);
        console.log(`[TenantManagement] 更新后租户允许的角色: ${updatedDetail.allowed_role_codes}`);
      } catch (err) {
        console.error('获取更新后的租户详情失败:', err);
      }
      
      if (currentTenant && selectedTenant.id === currentTenant.id) {
        console.log('[TenantManagement] 检测到修改的是当前登录租户，刷新全局租户信息');
        await refreshTenant();
      }
      
      console.log('='.repeat(60));
      console.log('[TenantManagement] ✅ 租户编辑保存完成');
      console.log('='.repeat(60));
    } catch (err) {
      console.error('[TenantManagement] ❌ 保存失败:', err);
      setFormError(err instanceof Error ? err.message : '更新租户失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = async (tenant: Tenant) => {
    try {
      const detail = await getTenantById(tenant.id);
      setSelectedTenant(detail);
      setEditFormData({
        name: detail.name,
        description: detail.description || '',
        logo_url: detail.logo_url || '',
        is_active: detail.is_active,
        itinerary_limit: detail.itinerary_limit,
        ai_calls_limit: detail.ai_calls_limit,
        allowed_role_codes: detail.allowed_role_codes || [],
      });
      setFormError(null);
      setShowEditModal(true);
    } catch (err) {
      console.error('获取租户详情失败:', err);
    }
  };

  const handleOpenDetailModal = async (tenant: Tenant) => {
    try {
      const detail = await getTenantById(tenant.id);
      setSelectedTenant(detail);
      setShowDetailModal(true);
    } catch (err) {
      console.error('获取租户详情失败:', err);
    }
  };

  const handleOpenCloneModal = async (tenant: Tenant) => {
    try {
      const detail = await getTenantById(tenant.id);
      setSelectedTenant(detail);
      setCloneFormData({
        name: `${detail.name} (副本)`,
        code: `${detail.code}_COPY`,
        clone_roles: true,
        clone_permissions: true,
        clone_config: true,
      });
      setFormError(null);
      setShowCloneModal(true);
    } catch (err) {
      console.error('获取租户详情失败:', err);
    }
  };

  const handleCloneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCloneFormData(prev => ({ 
      ...prev, 
      [name]: value 
    }));
  };

  const handleCloneCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setCloneFormData(prev => ({ 
      ...prev, 
      [name]: checked 
    }));
  };

  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    
    setFormError(null);
    setSubmitting(true);

    try {
      console.log('='.repeat(60));
      console.log('[TenantManagement] 开始克隆租户');
      console.log(`[TenantManagement] 源租户ID: ${selectedTenant.id}, 名称: ${selectedTenant.name}`);
      console.log(`[TenantManagement] 克隆配置: ${JSON.stringify(cloneFormData)}`);
      console.log('='.repeat(60));
      
      const result: TenantCloneResponse = await cloneTenant(selectedTenant.id, cloneFormData);
      
      console.log('='.repeat(60));
      console.log('[TenantManagement] ✅ 租户克隆成功');
      console.log(`[TenantManagement] 新租户: ID=${result.id}, 名称=${result.name}, 代码=${result.code}`);
      console.log(`[TenantManagement] 克隆统计: 角色=${result.cloned_roles_count}个, 权限=${result.cloned_permissions_count}个`);
      console.log('='.repeat(60));
      
      setShowCloneModal(false);
      fetchTenants();
      
      const tenantName = result.name || '未知租户';
      const tenantCode = result.code || '未知代码';
      const clonedRolesCount = result.cloned_roles_count ?? 0;
      const clonedPermissionsCount = result.cloned_permissions_count ?? 0;
      
      toast.success(
        `新租户: ${tenantName} (${tenantCode})\n已克隆 ${clonedRolesCount} 个角色，${clonedPermissionsCount} 个权限。`,
        '租户克隆成功'
      );
    } catch (err) {
      console.error('[TenantManagement] ❌ 克隆失败:', err);
      const errorMessage = err instanceof Error ? err.message : '克隆租户失败';
      setFormError(errorMessage);
      toast.error(errorMessage, '克隆失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTenant = async (tenant: Tenant) => {
    toast.confirm(
      `确定要删除租户 "${tenant.name}" 吗？此操作不可恢复。`,
      async () => {
        try {
          await deleteTenant(tenant.id);
          fetchTenants();
          toast.success(`租户 "${tenant.name}" 已成功删除`, '删除成功');
        } catch (err) {
          console.error('删除租户失败:', err);
          const errorMessage = '删除失败: ' + (err instanceof Error ? err.message : '未知错误');
          toast.error(errorMessage, '删除失败');
        }
      },
      '确认删除'
    );
  };

  const handleApproveUser = async (user: User) => {
    toast.confirm(
      `确定要通过用户 "${user.username}" 的注册申请吗？`,
      async () => {
        try {
          await approveUser(user.id);
          console.log('[TenantManagement] 用户审批通过:', user.username);
          fetchPendingUsers();
          toast.success(`用户 "${user.username}" 的注册申请已通过`, '审批成功');
        } catch (err) {
          console.error('审批用户失败:', err);
          const errorMessage = '审批失败: ' + (err instanceof Error ? err.message : '未知错误');
          toast.error(errorMessage, '审批失败');
        }
      },
      '确认审批'
    );
  };

  const handleOpenRejectModal = (user: User) => {
    setSelectedPendingUser(user);
    setRejectReason('');
    setFormError(null);
    setShowRejectModal(true);
  };

  const handleRejectUser = async () => {
    if (!selectedPendingUser) return;
    
    setSubmitting(true);
    setFormError(null);

    try {
      await rejectUser(selectedPendingUser.id, rejectReason || undefined);
      console.log('[TenantManagement] 用户申请被驳回:', selectedPendingUser.username);
      setShowRejectModal(false);
      fetchPendingUsers();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '驳回失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetQuota = async () => {
    if (!selectedTenant) return;
    
    toast.confirm(
      `确定要重置租户 "${selectedTenant.name}" 的配额使用量吗？`,
      async () => {
        try {
          await resetTenantQuota(selectedTenant.id);
          const updated = await getTenantById(selectedTenant.id);
          setSelectedTenant(updated);
          fetchTenants();
          
          if (currentTenant && selectedTenant.id === currentTenant.id) {
            console.log('[TenantManagement] 检测到重置的是当前登录租户配额，刷新全局租户信息');
            await refreshTenant();
          }
          
          toast.success(`租户 "${selectedTenant.name}" 的配额使用量已重置`, '重置成功');
        } catch (err) {
          console.error('重置配额失败:', err);
          const errorMessage = '重置失败: ' + (err instanceof Error ? err.message : '未知错误');
          toast.error(errorMessage, '重置失败');
        }
      },
      '确认重置'
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  const isCurrentTenant = (tenant: Tenant) => {
    return currentTenant && tenant.id === currentTenant.id;
  };

  return (
    <div className="tenant-management">
      <div className="form-card">
        <div className="card-header">
          <h2>🏢 租户管理</h2>
          {activeTab === 'tenants' && (
            <button
              type="button"
              className="add-btn"
              onClick={() => setShowCreateModal(true)}
            >
              ➕ 新增租户
            </button>
          )}
        </div>

        <div style={{ 
          display: 'flex', 
          marginBottom: '1.5rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <button
            type="button"
            onClick={() => handleTabChange('tenants')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'none',
              fontSize: '0.95rem',
              fontWeight: activeTab === 'tenants' ? 600 : 400,
              color: activeTab === 'tenants' ? '#667eea' : '#6b7280',
              borderBottom: activeTab === 'tenants' ? '2px solid #667eea' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            🏢 租户列表
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('pending')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'none',
              fontSize: '0.95rem',
              fontWeight: activeTab === 'pending' ? 600 : 400,
              color: activeTab === 'pending' ? '#667eea' : '#6b7280',
              borderBottom: activeTab === 'pending' ? '2px solid #667eea' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ⏳ 待审核
            {pendingUsers.length > 0 && (
              <span style={{
                background: '#f59e0b',
                color: 'white',
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontWeight: 600
              }}>
                {pendingUsers.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('rejected')}
            style={{
              padding: '0.75rem 1.5rem',
              border: 'none',
              background: 'none',
              fontSize: '0.95rem',
              fontWeight: activeTab === 'rejected' ? 600 : 400,
              color: activeTab === 'rejected' ? '#667eea' : '#6b7280',
              borderBottom: activeTab === 'rejected' ? '2px solid #667eea' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            ❌ 已驳回
            {rejectedUsers.length > 0 && (
              <span style={{
                background: '#ef4444',
                color: 'white',
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '9999px',
                fontWeight: 600
              }}>
                {rejectedUsers.length}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {activeTab === 'tenants' ? (
          <div>
            {selectedTenantIds.size > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem 1rem',
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                borderLeft: '3px solid #667eea',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <span style={{ fontWeight: 600, color: '#4c51bf' }}>
                  已选择 <span style={{ fontSize: '1.1rem' }}>{selectedTenantIds.size}</span> 个租户
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                  <button
                    type="button"
                    onClick={() => setShowBatchEnableModal(true)}
                    style={{
                      padding: '6px 16px',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#059669';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#10b981';
                    }}
                  >
                    ▶ 批量启用
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBatchDisableModal(true)}
                    style={{
                      padding: '6px 16px',
                      background: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#d97706';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f59e0b';
                    }}
                  >
                    ⏸ 批量禁用
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBatchDeleteModal(true)}
                    style={{
                      padding: '6px 16px',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#dc2626';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ef4444';
                    }}
                  >
                    🗑 批量删除
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTenantIds(new Set())}
                    style={{
                      padding: '6px 16px',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e5e7eb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f3f4f6';
                    }}
                  >
                    ✕ 取消选择
                  </button>
                </div>
              </div>
            )}
            {loading ? (
              <div className="loading">加载中...</div>
            ) : (
              <div className="table-container">
                <table className="tenant-table">
                  <thead>
                    <tr style={{ width: '100%' }}>
                      <th className="col-checkbox">
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', justifyContent: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            ref={(input) => {
                              if (input) {
                                input.indeterminate = isSomeSelected;
                              }
                            }}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              margin: 0
                            }}
                          />
                        </label>
                      </th>
                      <th className="col-id ellipsis-cell">ID</th>
                      <th className="col-name ellipsis-cell">租户名称</th>
                      <th className="col-code ellipsis-cell">代码</th>
                      <th className="col-resource">资源概览</th>
                      <th className="col-status">状态</th>
                      <th className="col-date ellipsis-cell">创建时间</th>
                      <th className="col-action">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="empty-row">
                          暂无租户数据
                        </td>
                      </tr>
                    ) : (
                      tenants.map(tenant => {
                        const itineraryPercentage = tenant.itinerary_limit > 0 
                          ? Math.min((tenant.itinerary_used / tenant.itinerary_limit) * 100, 100) 
                          : 0;
                        const aiPercentage = tenant.ai_calls_limit > 0 
                          ? Math.min((tenant.ai_calls_used / tenant.ai_calls_limit) * 100, 100) 
                          : 0;
                        
                        const isSelected = selectedTenantIds.has(tenant.id);
                        const isUpdated = updatedTenantIds.has(tenant.id);
                        
                        return (
                          <tr 
                            key={tenant.id}
                            style={{
                              background: isUpdated 
                                ? (tenant.is_active 
                                    ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)' 
                                    : 'linear-gradient(90deg, rgba(239, 68, 68, 0.2) 0%, rgba(220, 38, 38, 0.1) 100%)')
                                : isSelected 
                                  ? 'linear-gradient(90deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.1) 100%)'
                                  : isCurrentTenant(tenant) 
                                    ? 'linear-gradient(90deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                                    : 'transparent',
                              borderLeft: isCurrentTenant(tenant) ? '3px solid #667eea' : (isSelected ? '3px solid #667eea' : 'none'),
                              transition: 'all 0.3s ease-in-out'
                            }}
                          >
                            <td className="col-checkbox">
                              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', justifyContent: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => handleSelectTenant(tenant.id, e.target.checked)}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    cursor: 'pointer',
                                    margin: 0
                                  }}
                                />
                              </label>
                            </td>
                            <td className="col-id ellipsis-cell">
                              {tenant.id}
                              {isCurrentTenant(tenant) && (
                                <span className="current-tenant-badge">
                                  当前租户
                                </span>
                              )}
                            </td>
                            <td className="col-name tenant-name">
                              {tenant.logo_url ? (
                                <img 
                                  src={tenant.logo_url} 
                                  alt={tenant.name}
                                  style={{ width: '24px', height: '24px', marginRight: '8px', borderRadius: '4px' }}
                                />
                              ) : null}
                              {tenant.name}
                            </td>
                            <td className="col-code ellipsis-cell">
                              <span className="tenant-code">{tenant.code}</span>
                            </td>
                            <td className="col-resource">
                              <div className="resource-overview-cell">
                                <div className="resource-item">
                                  <div className="resource-icon-wrapper">
                                    <CircularProgress 
                                      percentage={itineraryPercentage} 
                                      size={40} 
                                      strokeWidth={4} 
                                      label={`${Math.round(itineraryPercentage)}%`}
                                    />
                                  </div>
                                  <div className="resource-info">
                                    <div className="resource-title">
                                      🗺️ 行程
                                    </div>
                                    <div className="resource-values">
                                      <span className={`resource-used ${getResourceUsedClass(itineraryPercentage)}`}>
                                        {tenant.itinerary_used}
                                      </span>
                                      <span className="resource-separator">/</span>
                                      <span>{tenant.itinerary_limit}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="resource-item">
                                  <div className="resource-icon-wrapper">
                                    <CircularProgress 
                                      percentage={aiPercentage} 
                                      size={40} 
                                      strokeWidth={4}
                                      label={`${Math.round(aiPercentage)}%`}
                                    />
                                  </div>
                                  <div className="resource-info">
                                    <div className="resource-title">
                                      🤖 AI
                                    </div>
                                    <div className="resource-values">
                                      <span className={`resource-used ${getResourceUsedClass(aiPercentage)}`}>
                                        {tenant.ai_calls_used}
                                      </span>
                                      <span className="resource-separator">/</span>
                                      <span>{tenant.ai_calls_limit}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="col-status">
                              <span 
                                style={{ 
                                  padding: '4px 12px', 
                                  borderRadius: '9999px',
                                  fontSize: '0.875rem',
                                  fontWeight: 500,
                                  background: tenant.is_active ? '#d1fae5' : '#fee2e2',
                                  color: tenant.is_active ? '#065f46' : '#dc2626',
                                  transition: 'all 0.3s ease-in-out',
                                  boxShadow: isUpdated 
                                    ? (tenant.is_active 
                                        ? '0 0 8px rgba(16, 185, 129, 0.6)' 
                                        : '0 0 8px rgba(239, 68, 68, 0.6)')
                                    : 'none'
                                }}
                              >
                                {tenant.is_active ? '✓ 激活' : '✗ 停用'}
                              </span>
                            </td>
                            <td className="col-date date-cell ellipsis-cell">{formatDate(tenant.created_at)}</td>
                            <td className="col-action">
                              <div style={{ position: 'relative', zIndex: expandedMenuId === tenant.id ? 9999 : 10 }}>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedMenuId(expandedMenuId === tenant.id ? null : tenant.id);
                                  }}
                                  style={{
                                    padding: '6px 12px',
                                    background: '#f9fafb',
                                    color: '#374151',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s',
                                    fontWeight: 500
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#e5e7eb';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#f9fafb';
                                  }}
                                >
                                  ⋮ 更多
                                </button>
                                {expandedMenuId === tenant.id && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: 0,
                                    marginTop: '6px',
                                    background: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                                    zIndex: 9999,
                                    minWidth: '140px',
                                    overflow: 'hidden'
                                  }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExpandedMenuId(null);
                                        handleOpenDetailModal(tenant);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '10px 16px',
                                        background: 'transparent',
                                        border: 'none',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        color: '#374151',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'background 0.2s'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#f3f4f6';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                      }}
                                    >
                                      👁️ 查看
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExpandedMenuId(null);
                                        handleOpenEditModal(tenant);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '10px 16px',
                                        background: 'transparent',
                                        border: 'none',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        color: '#374151',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'background 0.2s'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#f3f4f6';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                      }}
                                    >
                                      ✏️ 编辑
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setExpandedMenuId(null);
                                        handleOpenCloneModal(tenant);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '10px 16px',
                                        background: 'transparent',
                                        border: 'none',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        color: '#374151',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        transition: 'background 0.2s'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#f3f4f6';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                      }}
                                    >
                                      📋 克隆
                                    </button>
                                    {!isCurrentTenant(tenant) && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setExpandedMenuId(null);
                                          handleDeleteTenant(tenant);
                                        }}
                                        style={{
                                          width: '100%',
                                          padding: '10px 16px',
                                          background: 'transparent',
                                          border: 'none',
                                          textAlign: 'left',
                                          cursor: 'pointer',
                                          fontSize: '0.875rem',
                                          color: '#dc2626',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          transition: 'background 0.2s',
                                          borderTop: '1px solid #f3f4f6'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.currentTarget.style.background = '#fef2f2';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.currentTarget.style.background = 'transparent';
                                        }}
                                      >
                                        🗑️ 删除
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'pending' ? (
          <div>
            {loadingPending ? (
              <div className="loading">加载待审核用户中...</div>
            ) : (
              <div className="table-container">
                <table className="tenant-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>用户名</th>
                      <th>邮箱</th>
                      <th>目标租户</th>
                      <th>申请时间</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty-row">
                          暂无待审核用户
                        </td>
                      </tr>
                    ) : (
                      pendingUsers.map(user => (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.9rem'
                              }}>
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{user.username}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  角色: 普通用户
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>{user.email || '-'}</td>
                          <td>
                            <span style={{
                              background: '#fef3c7',
                              color: '#92400e',
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '0.875rem',
                              fontWeight: 500
                            }}>
                              {getTenantName(user.tenant_id)}
                            </span>
                          </td>
                          <td className="date-cell">{formatDate(user.created_at)}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() => handleApproveUser(user)}
                                style={{
                                  padding: '6px 16px',
                                  background: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: 500,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                ✓ 通过
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRejectModal(user)}
                                style={{
                                  padding: '6px 16px',
                                  background: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  fontWeight: 500,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                ✗ 驳回
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            {loadingRejected ? (
              <div className="loading">加载已驳回用户中...</div>
            ) : (
              <div className="table-container">
                <table className="tenant-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>用户名</th>
                      <th>邮箱</th>
                      <th>目标租户</th>
                      <th>申请时间</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rejectedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="empty-row">
                          暂无已驳回用户
                        </td>
                      </tr>
                    ) : (
                      rejectedUsers.map(user => (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 700,
                                fontSize: '0.9rem'
                              }}>
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{user.username}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                  角色: 普通用户
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>{user.email || '-'}</td>
                          <td>
                            <span style={{
                              background: '#fee2e2',
                              color: '#991b1b',
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '0.875rem',
                              fontWeight: 500
                            }}>
                              {getTenantName(user.tenant_id)}
                            </span>
                          </td>
                          <td className="date-cell">{formatDate(user.created_at)}</td>
                          <td>
                            <span style={{
                              background: '#fee2e2',
                              color: '#991b1b',
                              padding: '4px 12px',
                              borderRadius: '9999px',
                              fontSize: '0.875rem',
                              fontWeight: 500
                            }}>
                              ❌ 已驳回
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新增租户</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="error-message">{formError}</div>
            )}

            <form onSubmit={handleCreateSubmit}>
              <div className="form-group">
                <label htmlFor="create-name">租户名称 <span className="required">*</span></label>
                <input
                  id="create-name"
                  name="name"
                  type="text"
                  value={createFormData.name}
                  onChange={handleCreateInputChange}
                  placeholder="例如：公司A"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="create-code">租户代码 <span className="required">*</span></label>
                <input
                  id="create-code"
                  name="code"
                  type="text"
                  value={createFormData.code}
                  onChange={handleCreateInputChange}
                  placeholder="例如：TENANT_A"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="create-description">描述</label>
                <textarea
                  id="create-description"
                  name="description"
                  value={createFormData.description || ''}
                  onChange={handleCreateInputChange}
                  placeholder="租户详细描述"
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="create-logo">Logo URL</label>
                <input
                  id="create-logo"
                  name="logo_url"
                  type="text"
                  value={createFormData.logo_url || ''}
                  onChange={handleCreateInputChange}
                  placeholder="https://example.com/logo.png"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="create-itinerary-limit">行程数量上限</label>
                  <input
                    id="create-itinerary-limit"
                    name="itinerary_limit"
                    type="number"
                    min="0"
                    value={createFormData.itinerary_limit || 100}
                    onChange={handleCreateInputChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="create-ai-limit">AI调用次数上限</label>
                  <input
                    id="create-ai-limit"
                    name="ai_calls_limit"
                    type="number"
                    min="0"
                    value={createFormData.ai_calls_limit || 50}
                    onChange={handleCreateInputChange}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting}
                >
                  {submitting ? '提交中...' : '确认'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedTenant && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '900px', width: '90vw' }}>
            <div className="modal-header">
              <h3>编辑租户 - {selectedTenant.name}</h3>
              {isCurrentTenant(selectedTenant) && (
                <span style={{
                  padding: '4px 12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}>
                  当前租户
                </span>
              )}
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>

            {isCurrentTenant(selectedTenant) && (
              <div style={{
                padding: '0.75rem 1rem',
                background: 'linear-gradient(90deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                borderLeft: '3px solid #667eea',
                borderRadius: '4px',
                marginBottom: '1rem',
                fontSize: '0.875rem',
                color: '#4c51bf'
              }}>
                ⚠️ 您正在编辑当前登录的租户。修改后，页面左上角的租户信息将自动同步更新。
              </div>
            )}

            {formError && (
              <div className="error-message">{formError}</div>
            )}

            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ 
                  borderRight: '1px solid #e5e7eb', 
                  paddingRight: '1.5rem'
                }}>
                  <h4 style={{ 
                    margin: '0 0 1rem', 
                    color: '#374151', 
                    fontSize: '1rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    📋 基础信息
                  </h4>
                  
                  <div className="form-group">
                    <label htmlFor="edit-name">租户名称</label>
                    <input
                      id="edit-name"
                      name="name"
                      type="text"
                      value={editFormData.name || ''}
                      onChange={handleEditInputChange}
                      placeholder="例如：公司A"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-description">描述</label>
                    <textarea
                      id="edit-description"
                      name="description"
                      value={editFormData.description || ''}
                      onChange={handleEditInputChange}
                      placeholder="租户详细描述"
                      rows={3}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-logo">Logo URL</label>
                    <input
                      id="edit-logo"
                      name="logo_url"
                      type="text"
                      value={editFormData.logo_url || ''}
                      onChange={handleEditInputChange}
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <h4 style={{ 
                    margin: '1.5rem 0 1rem', 
                    color: '#374151', 
                    fontSize: '1rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    📊 配额设置
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label htmlFor="edit-itinerary-limit">行程数量上限</label>
                      <input
                        id="edit-itinerary-limit"
                        name="itinerary_limit"
                        type="number"
                        min="0"
                        value={editFormData.itinerary_limit || 0}
                        onChange={handleEditInputChange}
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="edit-ai-limit">AI调用次数上限</label>
                      <input
                        id="edit-ai-limit"
                        name="ai_calls_limit"
                        type="number"
                        min="0"
                        value={editFormData.ai_calls_limit || 0}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        name="is_active"
                        checked={editFormData.is_active ?? true}
                        onChange={handleEditInputChange}
                      />
                      <span>启用租户</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h4 style={{ 
                    margin: '0 0 1rem', 
                    color: '#374151', 
                    fontSize: '1rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    🎭 角色选择
                  </h4>
                  
                  <div style={{ 
                    background: '#f9fafb', 
                    padding: '1rem', 
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    maxHeight: '500px',
                    overflowY: 'auto'
                  }}>
                    {loadingRoles ? (
                      <div style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
                        加载角色列表中...
                      </div>
                    ) : roles.length === 0 ? (
                      <div style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', padding: '2rem' }}>
                        暂无角色数据
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {roles.map(role => {
                          const isSelected = (editFormData.allowed_role_codes || []).includes(role.code);
                          const isExpanded = expandedRoleCodes.has(role.code);
                          const groupedPerms = groupPermissionsByCategory(role.permissions);
                          
                          const toggleExpand = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            setExpandedRoleCodes(prev => {
                              const newSet = new Set(prev);
                              if (newSet.has(role.code)) {
                                newSet.delete(role.code);
                              } else {
                                newSet.add(role.code);
                              }
                              return newSet;
                            });
                          };
                          
                          return (
                            <div
                              key={role.id}
                              style={{
                                border: isSelected 
                                  ? '1px solid #667eea' 
                                  : '1px solid #e5e7eb',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                background: isSelected 
                                  ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)' 
                                  : 'white',
                                transition: 'all 0.2s',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  padding: '10px 12px',
                                  cursor: 'pointer',
                                }}
                                onClick={toggleExpand}
                              >
                                <label
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    cursor: 'pointer',
                                    flex: 1,
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const currentRoles = editFormData.allowed_role_codes || [];
                                      if (e.target.checked) {
                                        setEditFormData(prev => ({
                                          ...prev,
                                          allowed_role_codes: [...currentRoles, role.code]
                                        }));
                                      } else {
                                        setEditFormData(prev => ({
                                          ...prev,
                                          allowed_role_codes: currentRoles.filter(c => c !== role.code)
                                        }));
                                      }
                                    }}
                                    style={{ 
                                      width: '16px', 
                                      height: '16px', 
                                      cursor: 'pointer',
                                      margin: 0,
                                    }}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ 
                                      fontWeight: 600, 
                                      fontSize: '0.95rem', 
                                      color: isSelected ? '#4c51bf' : '#374151',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                    }}>
                                      {role.name}
                                      <span style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 500,
                                        color: isSelected ? '#667eea' : '#6b7280',
                                        background: isSelected 
                                          ? 'rgba(102, 126, 234, 0.1)' 
                                          : '#e5e7eb',
                                        padding: '2px 8px',
                                        borderRadius: '9999px',
                                      }}>
                                        {role.code}
                                      </span>
                                    </div>
                                    <div style={{ 
                                      fontSize: '0.75rem', 
                                      color: '#6b7280',
                                      marginTop: '2px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                    }}>
                                      <span>共 {role.permissions.length} 个权限</span>
                                      <span style={{ color: '#d1d5db' }}>|</span>
                                      <span>
                                        {CATEGORY_ORDER
                                          .filter(cat => groupedPerms[cat]?.length > 0)
                                          .map(cat => `${CATEGORY_ICONS[cat]} ${groupedPerms[cat].length}`)
                                          .join('  ')}
                                      </span>
                                    </div>
                                  </div>
                                </label>
                                <span style={{
                                  transition: 'transform 0.3s',
                                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  color: '#6b7280',
                                  fontSize: '1rem',
                                  padding: '4px',
                                }}>
                                  ▼
                                </span>
                              </div>
                              
                              {isExpanded && (
                                <div style={{
                                  padding: '0 12px 12px',
                                  borderTop: '1px solid #e5e7eb',
                                  background: 'white',
                                }}>
                                  <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '12px',
                                    marginTop: '12px',
                                  }}>
                                    {CATEGORY_ORDER.map(category => {
                                      const categoryPerms = groupedPerms[category] || [];
                                      if (categoryPerms.length === 0) return null;
                                      
                                      return (
                                        <div key={category}>
                                          <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            marginBottom: '6px',
                                            paddingLeft: '4px',
                                          }}>
                                            <span style={{ fontSize: '0.9rem' }}>
                                              {CATEGORY_ICONS[category]}
                                            </span>
                                            <span style={{
                                              fontWeight: 600,
                                              fontSize: '0.8rem',
                                              color: '#374151',
                                            }}>
                                              {category}
                                            </span>
                                            <span style={{
                                              fontSize: '0.7rem',
                                              color: '#9ca3af',
                                              background: '#f3f4f6',
                                              padding: '1px 6px',
                                              borderRadius: '4px',
                                            }}>
                                              {categoryPerms.length}
                                            </span>
                                          </div>
                                          <div style={{
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: '6px',
                                            paddingLeft: '28px',
                                          }}>
                                            {categoryPerms.map(perm => (
                                              <div
                                                key={perm.id}
                                                style={{
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '4px',
                                                  padding: '4px 10px',
                                                  background: '#f9fafb',
                                                  border: '1px solid #e5e7eb',
                                                  borderRadius: '4px',
                                                  fontSize: '0.75rem',
                                                }}
                                              >
                                                <span style={{
                                                  fontWeight: 500,
                                                  color: '#374151',
                                                }}>
                                                  {perm.name}
                                                </span>
                                                <span style={{
                                                  fontSize: '0.65rem',
                                                  color: '#6b7280',
                                                  background: perm.permission_type === 'menu' 
                                                    ? '#dbeafe' 
                                                    : '#dcfce7',
                                                  padding: '1px 4px',
                                                  borderRadius: '3px',
                                                }}>
                                                  {perm.permission_type === 'menu' ? '菜单' : '数据'}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    
                                    {role.description && (
                                      <div style={{
                                        marginTop: '8px',
                                        padding: '8px 12px',
                                        background: '#f9fafb',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        color: '#6b7280',
                                      }}>
                                        <strong>角色说明：</strong> {role.description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={{ 
                      marginTop: '1rem', 
                      fontSize: '0.75rem', 
                      color: '#6b7280',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #e5e7eb'
                    }}>
                      <strong>💡 提示：</strong>
                      <span style={{ marginLeft: '4px' }}>
                        勾选的角色表示该租户下的成员可以使用的角色。点击角色卡片右侧的箭头可展开查看该角色包含的权限及分类。
                      </span>
                      {(!editFormData.allowed_role_codes || editFormData.allowed_role_codes.length === 0) && (
                        <span style={{ color: '#ef4444', display: 'block', marginTop: '4px', fontWeight: 500 }}>
                          ⚠️ 未选择任何角色时，租户成员将只能使用默认的USER角色权限。
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowEditModal(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting}
                >
                  {submitting ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedTenant && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>租户详情 - {selectedTenant.name}</h3>
              {isCurrentTenant(selectedTenant) && (
                <span style={{
                  padding: '4px 12px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 600
                }}>
                  当前租户
                </span>
              )}
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowDetailModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '1rem 0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>租户代码</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>{selectedTenant.code}</div>
                </div>
                <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>状态</div>
                  <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: 600, 
                    color: selectedTenant.is_active ? '#065f46' : '#dc2626' 
                  }}>
                    {selectedTenant.is_active ? '✓ 激活' : '✗ 停用'}
                  </div>
                </div>
              </div>

              {selectedTenant.description && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>描述</div>
                  <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', color: '#374151' }}>
                    {selectedTenant.description}
                  </div>
                </div>
              )}

              <h4 style={{ margin: '1.5rem 0 1rem', color: '#374151' }}>📊 配额使用情况</h4>
              
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 500 }}>🗺️ 行程数量</span>
                  <span style={{ color: '#6b7280' }}>
                    {selectedTenant.itinerary_used} / {selectedTenant.itinerary_limit} 
                    ({selectedTenant.itinerary_percentage}%)
                  </span>
                </div>
                <div style={{ height: '12px', background: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      background: getPercentageColor(selectedTenant.itinerary_percentage),
                      width: `${Math.min(selectedTenant.itinerary_percentage, 100)}%`,
                      transition: 'width 0.3s'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                  <span style={{ color: '#10b981' }}>剩余: {selectedTenant.itinerary_remaining}</span>
                  <span style={{ color: '#6b7280' }}>已用: {selectedTenant.itinerary_used}</span>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 500 }}>🤖 AI调用次数</span>
                  <span style={{ color: '#6b7280' }}>
                    {selectedTenant.ai_calls_used} / {selectedTenant.ai_calls_limit} 
                    ({selectedTenant.ai_calls_percentage}%)
                  </span>
                </div>
                <div style={{ height: '12px', background: '#e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      background: getPercentageColor(selectedTenant.ai_calls_percentage),
                      width: `${Math.min(selectedTenant.ai_calls_percentage, 100)}%`,
                      transition: 'width 0.3s'
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', fontSize: '0.875rem' }}>
                  <span style={{ color: '#10b981' }}>剩余: {selectedTenant.ai_calls_remaining}</span>
                  <span style={{ color: '#6b7280' }}>已用: {selectedTenant.ai_calls_used}</span>
                </div>
              </div>

              <h4 style={{ margin: '1.5rem 0 1rem', color: '#374151' }}>🎭 允许的角色</h4>
              <div style={{ 
                background: '#f9fafb', 
                padding: '1rem', 
                borderRadius: '8px',
                marginBottom: '1.5rem'
              }}>
                {selectedTenant.allowed_role_codes && selectedTenant.allowed_role_codes.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedTenant.allowed_role_codes.map(roleCode => {
                      const role = roles.find(r => r.code === roleCode);
                      return (
                        <span 
                          key={roleCode}
                          style={{
                            padding: '6px 14px',
                            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                            border: '1px solid #667eea',
                            borderRadius: '9999px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            color: '#667eea'
                          }}
                        >
                          {role ? role.name : roleCode}
                          <span style={{ marginLeft: '4px', opacity: 0.7 }}>({roleCode})</span>
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ 
                    color: '#ef4444', 
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>⚠️</span>
                    <span>未配置允许的角色。租户成员将只能使用默认的USER角色权限。</span>
                  </div>
                )}
              </div>

              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', fontSize: '0.875rem', color: '#6b7280' }}>
                <div>创建时间: {formatDate(selectedTenant.created_at)}</div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={handleResetQuota}
                style={{ background: '#fef3c7', color: '#92400e' }}
              >
                🔄 重置配额
              </button>
              <button
                type="button"
                className="submit-btn"
                onClick={() => {
                  handleOpenEditModal(selectedTenant);
                  setShowDetailModal(false);
                }}
              >
                ✏️ 编辑
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && selectedPendingUser && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>驳回注册申请</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowRejectModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ 
                padding: '1rem',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  确认驳回用户申请
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                  用户名: <strong>{selectedPendingUser.username}</strong>
                </div>
                <div style={{ fontSize: '0.875rem' }}>
                  目标租户: <strong>{getTenantName(selectedPendingUser.tenant_id)}</strong>
                </div>
              </div>
            </div>

            {formError && (
              <div className="error-message">{formError}</div>
            )}

            <div className="form-group">
              <label htmlFor="reject-reason">驳回原因（可选）</label>
              <textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="请输入驳回原因..."
                rows={3}
                style={{ width: '100%' }}
              />
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowRejectModal(false)}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleRejectUser}
                disabled={submitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: submitting ? 0.5 : 1
                }}
              >
                {submitting ? '处理中...' : '确认驳回'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloneModal && selectedTenant && (
        <div className="modal-overlay" onClick={() => setShowCloneModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90vw' }}>
            <div className="modal-header">
              <h3>克隆租户 - {selectedTenant.name}</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowCloneModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ 
              padding: '0.75rem 1rem',
              background: 'linear-gradient(90deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
              borderLeft: '3px solid #667eea',
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: '#4c51bf'
            }}>
              ⚠️ 克隆将创建一个新的租户，并可选择复制源租户的角色、权限和配置。
            </div>

            {formError && (
              <div className="error-message">{formError}</div>
            )}

            <form onSubmit={handleCloneSubmit}>
              <h4 style={{ 
                margin: '0 0 1rem', 
                color: '#374151', 
                fontSize: '1rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                📋 新租户信息
              </h4>

              <div className="form-group">
                <label htmlFor="clone-name">新租户名称 <span className="required">*</span></label>
                <input
                  id="clone-name"
                  name="name"
                  type="text"
                  value={cloneFormData.name}
                  onChange={handleCloneInputChange}
                  placeholder="例如：公司A (副本)"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="clone-code">新租户代码 <span className="required">*</span></label>
                <input
                  id="clone-code"
                  name="code"
                  type="text"
                  value={cloneFormData.code}
                  onChange={handleCloneInputChange}
                  placeholder="例如：TENANT_A_COPY"
                  required
                />
              </div>

              <h4 style={{ 
                margin: '1.5rem 0 1rem', 
                color: '#374151', 
                fontSize: '1rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                🎯 克隆维度选择
              </h4>

              <div style={{ 
                background: '#f9fafb', 
                padding: '1rem', 
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: 0 }}>
                      <input
                        type="checkbox"
                        name="clone_roles"
                        checked={cloneFormData.clone_roles}
                        onChange={handleCloneCheckboxChange}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', margin: 0 }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: '#374151' }}>🎭 克隆角色</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                          复制源租户允许的角色列表。当前源租户允许 {selectedTenant.allowed_role_codes?.length || 0} 个角色。
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: 0 }}>
                      <input
                        type="checkbox"
                        name="clone_permissions"
                        checked={cloneFormData.clone_permissions}
                        onChange={handleCloneCheckboxChange}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', margin: 0 }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: '#374151' }}>🔑 克隆权限</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                          复制源租户角色关联的所有权限。权限通过角色间接关联。
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: 0 }}>
                      <input
                        type="checkbox"
                        name="clone_config"
                        checked={cloneFormData.clone_config}
                        onChange={handleCloneCheckboxChange}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', margin: 0 }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: '#374151' }}>⚙️ 克隆配置</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px' }}>
                          复制源租户的配额配置（行程上限: {selectedTenant.itinerary_limit}, AI调用上限: {selectedTenant.ai_calls_limit}）。
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                <div style={{ 
                  marginTop: '1rem', 
                  fontSize: '0.75rem', 
                  color: '#6b7280',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid #e5e7eb'
                }}>
                  <strong>💡 提示：</strong>
                  <span style={{ marginLeft: '4px' }}>
                    角色和权限是全局共享的，克隆操作会复制源租户对这些角色的引用关系，而不是创建新的角色实例。
                  </span>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowCloneModal(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={submitting}
                >
                  {submitting ? '克隆中...' : '确认克隆'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBatchEnableModal && (
        <div className="modal-overlay" onClick={() => setShowBatchEnableModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>确认批量启用</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowBatchEnableModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ 
                padding: '1rem',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                borderLeft: '3px solid #10b981',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <div style={{ fontWeight: 600, color: '#065f46', marginBottom: '0.5rem' }}>
                  即将启用以下租户：
                </div>
                <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>已选择 {selectedTenantIds.size} 个租户</strong>
                  </div>
                  <div style={{ 
                    maxHeight: '150px', 
                    overflowY: 'auto',
                    background: 'white',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #d1fae5'
                  }}>
                    {getSelectedTenants().map(tenant => (
                      <div key={tenant.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        padding: '4px 0',
                        borderBottom: '1px solid #f3f4f6'
                      }}>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          background: tenant.is_active ? '#d1fae5' : '#fee2e2',
                          color: tenant.is_active ? '#065f46' : '#dc2626'
                        }}>
                          {tenant.is_active ? '已启用' : '已禁用'}
                        </span>
                        <span style={{ fontWeight: 500 }}>{tenant.name}</span>
                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>({tenant.code})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                <strong>⚠️ 注意：</strong> 此操作将启用所选租户中当前处于禁用状态的租户。启用后，这些租户的用户将可以正常登录和使用系统。
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowBatchEnableModal(false)}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleBatchEnable}
                disabled={submitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: submitting ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {submitting ? '处理中...' : '确认启用'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBatchDisableModal && (
        <div className="modal-overlay" onClick={() => setShowBatchDisableModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>确认批量禁用</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowBatchDisableModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ 
                padding: '1rem',
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)',
                borderLeft: '3px solid #f59e0b',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <div style={{ fontWeight: 600, color: '#92400e', marginBottom: '0.5rem' }}>
                  即将禁用以下租户：
                </div>
                <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>已选择 {selectedTenantIds.size} 个租户</strong>
                  </div>
                  <div style={{ 
                    maxHeight: '150px', 
                    overflowY: 'auto',
                    background: 'white',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #fef3c7'
                  }}>
                    {getSelectedTenants().map(tenant => (
                      <div key={tenant.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        padding: '4px 0',
                        borderBottom: '1px solid #f3f4f6'
                      }}>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          background: tenant.is_active ? '#d1fae5' : '#fee2e2',
                          color: tenant.is_active ? '#065f46' : '#dc2626'
                        }}>
                          {tenant.is_active ? '已启用' : '已禁用'}
                        </span>
                        <span style={{ fontWeight: 500 }}>{tenant.name}</span>
                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>({tenant.code})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                <strong>⚠️ 注意：</strong> 此操作将禁用所选租户中当前处于启用状态的租户。禁用后，这些租户的用户将无法登录系统。此操作不会删除租户数据，可随时重新启用。
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowBatchDisableModal(false)}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleBatchDisable}
                disabled={submitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: submitting ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {submitting ? '处理中...' : '确认禁用'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBatchDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowBatchDeleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>确认批量删除</h3>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowBatchDeleteModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ 
                padding: '1rem',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                borderLeft: '3px solid #ef4444',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <div style={{ fontWeight: 600, color: '#991b1b', marginBottom: '0.5rem' }}>
                  即将删除以下租户：
                </div>
                <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>已选择 {selectedTenantIds.size} 个租户</strong>
                  </div>
                  <div style={{ 
                    maxHeight: '150px', 
                    overflowY: 'auto',
                    background: 'white',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #fee2e2'
                  }}>
                    {getSelectedTenants().map(tenant => (
                      <div key={tenant.id} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        padding: '4px 0',
                        borderBottom: '1px solid #f3f4f6'
                      }}>
                        <span style={{ fontWeight: 500 }}>{tenant.name}</span>
                        <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>({tenant.code})</span>
                        {isCurrentTenant(tenant) && (
                          <span style={{ 
                            padding: '2px 8px', 
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white'
                          }}>
                            当前租户
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                <strong>⚠️ 重要警告：</strong> 此操作将永久删除所选租户及其相关数据（包括用户、行程等）。此操作不可恢复，请谨慎操作。
                {getSelectedTenants().some(t => isCurrentTenant(t)) && (
                  <div style={{ marginTop: '0.5rem', color: '#ef4444', fontWeight: 500 }}>
                    ⚠️ 您选择了当前登录的租户，该租户将不会被删除。
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowBatchDeleteModal(false)}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleBatchDelete}
                disabled={submitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  opacity: submitting ? 0.5 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {submitting ? '处理中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
