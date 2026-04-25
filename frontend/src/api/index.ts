import { ItineraryRequest, ItineraryResponse } from '../types';

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
