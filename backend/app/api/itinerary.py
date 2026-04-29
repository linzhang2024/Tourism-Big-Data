import logging
import asyncio
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from app.models.itinerary import (
    ItineraryRequest, 
    ItineraryResponse, 
    ItineraryCreate, 
    ItineraryUpdate, 
    ItineraryDetail
)
from app.models.user import UserResponse
from app.services.itinerary_service import generate_mock_itinerary, itinerary_service, ai_itinerary_service
from app.api.auth import require_permissions, require_any_permission

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate", response_model=ItineraryResponse)
async def generate_itinerary(
    request: ItineraryRequest,
    current_user: UserResponse = Depends(require_permissions(["itinerary:create"]))
):
    logger.info(f"[行程API] 用户 '{current_user.username}' 请求生成行程")
    return generate_mock_itinerary(request)


@router.post("/generate-and-save", response_model=ItineraryDetail)
async def generate_and_save_itinerary(
    request: ItineraryRequest,
    current_user: UserResponse = Depends(require_permissions(["itinerary:create"]))
):
    logger.info(f"[行程API] 用户 '{current_user.username}' (ID={current_user.id}) 请求AI生成并保存行程")
    logger.info(f"[行程API] 参数: 目的地={request.destination}, 天数={request.days}, 出发地={request.departure}")
    if request.budget:
        logger.info(f"[行程API] 预算={request.budget} 元")
    if request.interests:
        logger.info(f"[行程API] 兴趣偏好={[i.value for i in request.interests]}")
    
    logger.info(f"[行程API] 开始模拟AI生成过程...")
    await asyncio.sleep(2)
    
    saved = ai_itinerary_service.generate_and_save(request, current_user.id)
    
    logger.info(f"[行程API] AI行程生成并保存成功: ID={saved.id}, 标题={saved.title}")
    return saved


@router.get("/", response_model=List[ItineraryDetail])
async def get_all_itineraries(
    current_user: UserResponse = Depends(require_any_permission(["itinerary:view", "data:view"]))
):
    logger.info(f"[行程API] 用户 '{current_user.username}' 获取所有行程列表")
    return itinerary_service.get_all_itineraries()


@router.get("/my", response_model=List[ItineraryDetail])
async def get_my_itineraries(
    current_user: UserResponse = Depends(require_any_permission(["itinerary:view", "data:view"]))
):
    logger.info(f"[行程API] 用户 '{current_user.username}' 获取自己的行程列表")
    return itinerary_service.get_itineraries_by_user(current_user.id)


@router.get("/{itinerary_id}", response_model=ItineraryDetail)
async def get_itinerary(
    itinerary_id: int,
    current_user: UserResponse = Depends(require_any_permission(["itinerary:view", "data:view"]))
):
    logger.info(f"[行程API] 用户 '{current_user.username}' 获取行程详情: ID={itinerary_id}")
    itinerary = itinerary_service.get_itinerary_by_id(itinerary_id)
    if itinerary is None:
        raise HTTPException(
            status_code=404,
            detail=f"行程 ID '{itinerary_id}' 不存在"
        )
    return itinerary


@router.post("/", response_model=ItineraryDetail, status_code=201)
async def create_itinerary(
    itinerary: ItineraryCreate,
    current_user: UserResponse = Depends(require_permissions(["itinerary:create"]))
):
    logger.info(f"[行程API] 用户 '{current_user.username}' 创建新行程: 标题={itinerary.title}")
    return itinerary_service.create_itinerary(itinerary, current_user.id)


@router.put("/{itinerary_id}", response_model=ItineraryDetail)
async def update_itinerary(
    itinerary_id: int,
    itinerary: ItineraryUpdate,
    current_user: UserResponse = Depends(require_permissions(["itinerary:update"]))
):
    logger.info(f"[行程API] 用户 '{current_user.username}' 更新行程: ID={itinerary_id}")
    updated = itinerary_service.update_itinerary(itinerary_id, itinerary)
    if updated is None:
        raise HTTPException(
            status_code=404,
            detail=f"行程 ID '{itinerary_id}' 不存在"
        )
    return updated


@router.delete("/{itinerary_id}", status_code=204)
async def delete_itinerary(
    itinerary_id: int,
    current_user: UserResponse = Depends(require_permissions(["itinerary:delete"]))
):
    logger.info(f"[行程API] 用户 '{current_user.username}' 删除行程: ID={itinerary_id}")
    success = itinerary_service.delete_itinerary(itinerary_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"行程 ID '{itinerary_id}' 不存在"
        )
    return None
