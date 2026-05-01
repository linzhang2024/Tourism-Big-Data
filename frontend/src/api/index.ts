import { 
  ItineraryRequest, 
  ItineraryResponse, 
  TrendModel, 
  RoleResponse, 
  RoleCreate, 
  PermissionResponse, 
  StatsResponse,
  ItineraryCreate,
  ItineraryUpdate,
  ItineraryDetail,
  AnalysisResponse,
  Tenant,
  TenantWithQuota,
  TenantCreate,
  TenantUpdate,
  QuotaUsage,
  User,
  RegisterRequest,
  RejectRequest
} from '../types';
import apiAxios from '../utils/axios';

const API_BASE_URL = '/api';

export async function generateItinerary(request: ItineraryRequest): Promise<ItineraryResponse> {
  const response = await apiAxios.post<ItineraryResponse>('/itinerary/generate', request);
  return response.data;
}

export async function generateAndSaveItinerary(request: ItineraryRequest): Promise<ItineraryDetail> {
  const response = await apiAxios.post<ItineraryDetail>('/itinerary/generate-and-save', request);
  return response.data;
}

export async function getItineraries(): Promise<ItineraryDetail[]> {
  const response = await apiAxios.get<ItineraryDetail[]>('/itinerary/');
  return response.data;
}

export async function getMyItineraries(): Promise<ItineraryDetail[]> {
  const response = await apiAxios.get<ItineraryDetail[]>('/itinerary/my');
  return response.data;
}

export async function getItineraryById(id: number): Promise<ItineraryDetail> {
  const response = await apiAxios.get<ItineraryDetail>(`/itinerary/${id}`);
  return response.data;
}

export async function createItinerary(itinerary: ItineraryCreate): Promise<ItineraryDetail> {
  const response = await apiAxios.post<ItineraryDetail>('/itinerary/', itinerary);
  return response.data;
}

export async function updateItinerary(id: number, itinerary: ItineraryUpdate): Promise<ItineraryDetail> {
  const response = await apiAxios.put<ItineraryDetail>(`/itinerary/${id}`, itinerary);
  return response.data;
}

export async function deleteItinerary(id: number): Promise<void> {
  await apiAxios.delete(`/itinerary/${id}`);
}

export async function getTrends(cities?: string[]): Promise<TrendModel[]> {
  const url = new URL(`${API_BASE_URL}/trends/`);
  
  if (cities && cities.length > 0) {
    cities.forEach(city => url.searchParams.append('cities', city));
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error('获取旅游趋势数据失败');
  }

  return response.json();
}

export async function getRoles(): Promise<RoleResponse[]> {
  const response = await fetch(`${API_BASE_URL}/roles/`);

  if (!response.ok) {
    throw new Error('获取角色列表失败');
  }

  return response.json();
}

export async function createRole(role: RoleCreate): Promise<RoleResponse> {
  const response = await fetch(`${API_BASE_URL}/roles/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(role),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: '创建角色失败' }));
    throw new Error(errorData.detail || '创建角色失败');
  }

  return response.json();
}

export async function getPermissions(): Promise<PermissionResponse[]> {
  const response = await fetch(`${API_BASE_URL}/permissions/`);

  if (!response.ok) {
    throw new Error('获取权限列表失败');
  }

  return response.json();
}

export async function updateRolePermissions(roleId: number, permissionCodes: string[]): Promise<RoleResponse> {
  const response = await fetch(`${API_BASE_URL}/roles/${roleId}/permissions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ permission_codes: permissionCodes }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: '更新角色权限失败' }));
    throw new Error(errorData.detail || '更新角色权限失败');
  }

  return response.json();
}

export async function getStats(): Promise<StatsResponse> {
  console.log('[API] 调用 getStats (使用 axios)');
  
  const response = await apiAxios.get<StatsResponse>('/stats/');

  console.log('[API] getStats 响应状态:', response.status);
  console.log('[API] getStats 成功:', response.data);
  
  return response.data;
}

export interface AnalysisParams {
  start_date?: string;
  end_date?: string;
  destination_categories?: string[];
}

export async function getAnalysis(params?: AnalysisParams): Promise<AnalysisResponse> {
  console.log('[API] 调用 getAnalysis，参数:', params);
  
  let queryParams: Record<string, string | string[]> = {};
  
  if (params) {
    if (params.start_date) {
      queryParams['start_date'] = params.start_date;
    }
    if (params.end_date) {
      queryParams['end_date'] = params.end_date;
    }
    if (params.destination_categories && params.destination_categories.length > 0) {
      queryParams['destination_categories'] = params.destination_categories;
    }
  }

  const response = await apiAxios.get<AnalysisResponse>('/stats/analysis', {
    params: queryParams,
    paramsSerializer: (params) => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(item => {
            searchParams.append(key, item);
          });
        } else if (value !== undefined && value !== null) {
          searchParams.append(key, value);
        }
      });
      return searchParams.toString();
    }
  });

  console.log('[API] getAnalysis 成功:', response.data);
  
  return response.data;
}

export interface ExportParams extends AnalysisParams {
  format: 'json' | 'csv';
}

export async function exportStats(params: ExportParams): Promise<Blob> {
  console.log('[API] 调用 exportStats，参数:', params);
  
  const url = new URL(`${API_BASE_URL}/stats/export`);
  
  url.searchParams.append('format', params.format);
  
  if (params.start_date) {
    url.searchParams.append('start_date', params.start_date);
  }
  if (params.end_date) {
    url.searchParams.append('end_date', params.end_date);
  }
  if (params.destination_categories && params.destination_categories.length > 0) {
    params.destination_categories.forEach(cat => {
      url.searchParams.append('destination_categories', cat);
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
    },
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: '导出失败' }));
    throw new Error(errorData.detail || '导出失败');
  }

  const blob = await response.blob();
  console.log('[API] exportStats 成功，文件大小:', blob.size);
  
  return blob;
}

export function downloadFile(blob: Blob, filename: string): void {
  console.log('[API] 开始下载文件:', filename);
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  
  console.log('[API] 文件下载完成');
}

export async function getTenants(): Promise<Tenant[]> {
  console.log('[API] 调用 getTenants');
  const response = await apiAxios.get<Tenant[]>('/tenants/');
  console.log('[API] getTenants 成功:', response.data);
  return response.data;
}

export async function getTenantById(tenantId: number): Promise<TenantWithQuota> {
  console.log('[API] 调用 getTenantById:', tenantId);
  const response = await apiAxios.get<TenantWithQuota>(`/tenants/${tenantId}`);
  console.log('[API] getTenantById 成功:', response.data);
  return response.data;
}

export async function createTenant(tenant: TenantCreate): Promise<Tenant> {
  console.log('[API] 调用 createTenant:', tenant);
  const response = await apiAxios.post<Tenant>('/tenants/', tenant);
  console.log('[API] createTenant 成功:', response.data);
  return response.data;
}

export async function updateTenant(tenantId: number, tenant: TenantUpdate): Promise<Tenant> {
  console.log('[API] 调用 updateTenant:', tenantId, tenant);
  const response = await apiAxios.put<Tenant>(`/tenants/${tenantId}`, tenant);
  console.log('[API] updateTenant 成功:', response.data);
  return response.data;
}

export async function deleteTenant(tenantId: number): Promise<void> {
  console.log('[API] 调用 deleteTenant:', tenantId);
  await apiAxios.delete(`/tenants/${tenantId}`);
  console.log('[API] deleteTenant 成功');
}

export async function getMyQuota(): Promise<QuotaUsage> {
  console.log('[API] 调用 getMyQuota');
  const response = await apiAxios.get<QuotaUsage>('/tenants/my/quota');
  console.log('[API] getMyQuota 成功:', response.data);
  return response.data;
}

export async function getMyTenantInfo(): Promise<TenantWithQuota> {
  console.log('[API] 调用 getMyTenantInfo');
  const response = await apiAxios.get<TenantWithQuota>('/tenants/my/info');
  console.log('[API] getMyTenantInfo 成功:', response.data);
  return response.data;
}

export async function resetTenantQuota(tenantId: number): Promise<QuotaUsage> {
  console.log('[API] 调用 resetTenantQuota:', tenantId);
  const response = await apiAxios.post<QuotaUsage>(`/tenants/${tenantId}/quota/reset`);
  console.log('[API] resetTenantQuota 成功:', response.data);
  return response.data;
}

export async function register(request: RegisterRequest): Promise<User> {
  console.log('[API] 调用 register:', request.username);
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: '注册失败' }));
    throw new Error(errorData.detail || '注册失败');
  }

  const data = await response.json();
  console.log('[API] register 成功:', data);
  return data;
}

export async function getPendingUsers(): Promise<User[]> {
  console.log('[API] 调用 getPendingUsers');
  const response = await apiAxios.get<User[]>('/auth/pending');
  console.log('[API] getPendingUsers 成功:', response.data);
  return response.data;
}

export async function approveUser(userId: number): Promise<User> {
  console.log('[API] 调用 approveUser:', userId);
  const response = await apiAxios.post<User>(`/auth/approve/${userId}`);
  console.log('[API] approveUser 成功:', response.data);
  return response.data;
}

export async function rejectUser(userId: number, reason?: string): Promise<void> {
  console.log('[API] 调用 rejectUser:', userId, '原因:', reason);
  await apiAxios.post(`/auth/reject/${userId}`, { reason });
  console.log('[API] rejectUser 成功');
}
