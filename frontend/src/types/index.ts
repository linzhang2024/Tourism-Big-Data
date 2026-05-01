export type InterestPreference = 'culture' | 'nature' | 'food' | 'shopping' | 'adventure' | 'relaxation';

export interface TrendModel {
  city: string;
  keyword: string;
  score: number;
}

export interface PermissionResponse {
  id: number;
  name: string;
  code: string;
  description?: string;
  created_at: string;
}

export interface RoleResponse {
  id: number;
  name: string;
  code: string;
  description?: string;
  created_at: string;
  permissions: PermissionResponse[];
}

export interface RoleCreate {
  name: string;
  code: string;
  description?: string;
}

export interface Activity {
  time: string;
  name: string;
  description?: string;
  location?: string;
  estimated_cost?: number;
  category?: string;
}

export interface DayPlan {
  day: number;
  activities: Activity[];
  summary?: string;
}

export interface ItineraryRequest {
  departure: string;
  destination: string;
  days: number;
  budget?: number;
  interests?: InterestPreference[];
  travel_style?: string;
}

export interface ItineraryResponse {
  title: string;
  departure: string;
  destination: string;
  days: number;
  estimated_total_cost?: number;
  daily_plans: DayPlan[];
  tips?: string[];
}

export interface ItineraryCreate {
  title: string;
  departure: string;
  destination: string;
  days: number;
  budget?: number;
  estimated_total_cost?: number;
  daily_plans: DayPlan[];
  tips?: string[];
  interests?: InterestPreference[];
  travel_style?: string;
  is_ai_generated?: boolean;
}

export interface ItineraryUpdate {
  title?: string;
  departure?: string;
  destination?: string;
  days?: number;
  budget?: number;
  estimated_total_cost?: number;
  daily_plans?: DayPlan[];
  tips?: string[];
  interests?: InterestPreference[];
  travel_style?: string;
  is_ai_generated?: boolean;
}

export interface ItineraryDetail {
  id: number;
  user_id: number;
  title: string;
  departure: string;
  destination: string;
  days: number;
  budget?: number;
  estimated_total_cost?: number;
  daily_plans: DayPlan[];
  tips?: string[];
  interests?: string[];
  travel_style?: string;
  is_ai_generated: boolean;
  created_at: string;
  updated_at?: string;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  role_code: string;
  created_at: string;
  updated_at?: string;
  permissions: string[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  loading: boolean;
}

export interface StatsResponse {
  access_level: string;
  data_retrieved_at: string;
  stats: Record<string, any>;
  user_role: string;
  user_permissions: string[];
}

export type PermissionCode = 'data:view' | 'data:export' | 'spider:run' | 'sys:manage';

export interface CityHotspot {
  name: string;
  count: number;
  avg_budget: number;
  total_spending: number;
}

export interface MonthlyTrend {
  month: string;
  total_itineraries: number;
  total_spending: number;
  avg_budget: number;
}

export interface AnalysisResponse {
  generated_at: string;
  period: {
    start_date: string | null;
    end_date: string | null;
  };
  city_hotspots: CityHotspot[];
  monthly_trends: MonthlyTrend[];
  summary: {
    total_itineraries: number;
    total_spending: number;
    total_budget: number;
    avg_spending_per_itinerary: number;
    total_cities: number;
    top_city: string | null;
    top_city_count: number;
  };
}

export interface Tenant {
  id: number;
  name: string;
  code: string;
  description?: string;
  logo_url?: string;
  itinerary_limit: number;
  ai_calls_limit: number;
  created_at: string;
  is_active: boolean;
  itinerary_used: number;
  ai_calls_used: number;
}

export interface TenantWithQuota extends Tenant {
  itinerary_remaining: number;
  ai_calls_remaining: number;
  itinerary_percentage: number;
  ai_calls_percentage: number;
}

export interface QuotaUsage {
  itinerary_used: number;
  ai_calls_used: number;
  itinerary_limit: number;
  ai_calls_limit: number;
  itinerary_remaining: number;
  ai_calls_remaining: number;
}

export interface TenantCreate {
  name: string;
  code: string;
  description?: string;
  logo_url?: string;
  itinerary_limit?: number;
  ai_calls_limit?: number;
}

export interface TenantUpdate {
  name?: string;
  description?: string;
  logo_url?: string;
  is_active?: boolean;
  itinerary_limit?: number;
  ai_calls_limit?: number;
}
