import { ItineraryRequest, ItineraryResponse, TrendModel, RoleResponse, RoleCreate, PermissionResponse } from '../types';

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
