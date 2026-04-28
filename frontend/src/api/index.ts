import { ItineraryRequest, ItineraryResponse, TrendModel, RoleResponse, RoleCreate, PermissionResponse, StatsResponse } from '../types';

const API_BASE_URL = '/api';

export async function generateItinerary(request: ItineraryRequest): Promise<ItineraryResponse> {
  const response = await fetch(`${API_BASE_URL}/itinerary/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('生成行程失败');
  }

  return response.json();
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

export async function getStats(token: string): Promise<StatsResponse> {
  console.log('[API] 调用 getStats，Token 长度:', token.length);
  
  const response = await fetch(`${API_BASE_URL}/stats/`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('[API] getStats 响应状态:', response.status);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: '获取统计数据失败' }));
    console.error('[API] getStats 失败:', errorData);
    throw new Error(errorData.detail || '获取统计数据失败');
  }

  const data = await response.json();
  console.log('[API] getStats 成功:', data);
  return data;
}
