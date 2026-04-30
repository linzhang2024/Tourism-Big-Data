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
  AnalysisResponse
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
  
  const url = new URL(`${API_BASE_URL}/stats/analysis`);
  
  if (params) {
    if (params.start_date) {
      url.searchParams.append('start_date', params.start_date);
    }
    if (params.end_date) {
      url.searchParams.append('end_date', params.end_date);
    }
    if (params.destination_categories && params.destination_categories.length > 0) {
      params.destination_categories.forEach(city => {
        url.searchParams.append('destination_categories', city);
      });
    }
  }

  const response = await apiAxios.get<AnalysisResponse>(url.toString());

  console.log('[API] getAnalysis 成功:', response.data);
  
  return response.data;
}
