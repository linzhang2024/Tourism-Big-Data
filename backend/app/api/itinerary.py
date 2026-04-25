from fastapi import APIRouter

from app.models.itinerary import ItineraryRequest, ItineraryResponse
from app.services.itinerary_service import generate_mock_itinerary

router = APIRouter()


@router.post("/generate", response_model=ItineraryResponse)
async def generate_itinerary(request: ItineraryRequest):
    return generate_mock_itinerary(request)
