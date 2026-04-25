export type InterestPreference = 'culture' | 'nature' | 'food' | 'shopping' | 'adventure' | 'relaxation';

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
