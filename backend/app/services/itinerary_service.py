import logging
from typing import List, Optional
from datetime import datetime
from copy import deepcopy

from app.models.itinerary import (
    ItineraryRequest, 
    ItineraryResponse, 
    ItineraryCreate, 
    ItineraryUpdate, 
    ItineraryDetail,
    DayPlan, 
    Activity, 
    InterestPreference
)
from app.utils.cache_manager import cache_manager

logger = logging.getLogger(__name__)

CACHE_TTL = 60
CACHE_KEY_ALL = "itinerary:all"
CACHE_KEY_USER_PREFIX = "itinerary:user:"
CACHE_KEY_DETAIL_PREFIX = "itinerary:detail:"


def generate_mock_itinerary(request: ItineraryRequest) -> ItineraryResponse:
    mock_activities = {
        "culture": [
            {"time": "09:00-11:00", "name": "参观当地博物馆", "description": "了解当地历史文化", "location": "市中心博物馆", "estimated_cost": 50.0, "category": "culture"},
            {"time": "14:00-16:00", "name": "历史街区漫步", "description": "探索古老街道", "location": "老城区", "estimated_cost": 0.0, "category": "culture"},
        ],
        "nature": [
            {"time": "08:00-10:00", "name": "公园晨练", "description": "呼吸新鲜空气", "location": "城市公园", "estimated_cost": 0.0, "category": "nature"},
            {"time": "15:00-17:00", "name": "登山观景", "description": "俯瞰城市全景", "location": "近郊山脉", "estimated_cost": 20.0, "category": "nature"},
        ],
        "food": [
            {"time": "11:30-13:00", "name": "品尝当地特色午餐", "description": "体验地道美食", "location": "特色餐厅", "estimated_cost": 80.0, "category": "food"},
            {"time": "19:00-21:00", "name": "夜市小吃", "description": "体验当地夜生活", "location": "著名夜市", "estimated_cost": 50.0, "category": "food"},
        ],
        "shopping": [
            {"time": "10:00-12:00", "name": "购物中心逛街", "description": "购买纪念品", "location": "大型商场", "estimated_cost": 200.0, "category": "shopping"},
            {"time": "14:00-16:00", "name": "特色小店探索", "description": "发现独特商品", "location": "特色街区", "estimated_cost": 100.0, "category": "shopping"},
        ],
        "adventure": [
            {"time": "09:00-12:00", "name": "户外探险", "description": "刺激的户外活动", "location": "郊外", "estimated_cost": 150.0, "category": "adventure"},
            {"time": "14:00-17:00", "name": "水上活动", "description": "享受水上乐趣", "location": "水上乐园", "estimated_cost": 100.0, "category": "adventure"},
        ],
        "relaxation": [
            {"time": "10:00-12:00", "name": "温泉放松", "description": "舒缓身心", "location": "温泉度假村", "estimated_cost": 200.0, "category": "relaxation"},
            {"time": "15:00-17:00", "name": "SPA 体验", "description": "专业按摩护理", "location": "高端 SPA", "estimated_cost": 300.0, "category": "relaxation"},
        ],
    }

    default_activities = [
        {"time": "08:30-09:30", "name": "酒店早餐", "description": "享用丰盛早餐", "location": "酒店餐厅", "estimated_cost": 0.0, "category": "food"},
        {"time": "12:00-13:30", "name": "午餐", "description": "当地特色美食", "location": "推荐餐厅", "estimated_cost": 60.0, "category": "food"},
        {"time": "18:00-19:30", "name": "晚餐", "description": "浪漫晚餐", "location": "观景餐厅", "estimated_cost": 100.0, "category": "food"},
        {"time": "20:00-21:00", "name": "返回酒店休息", "description": "结束一天行程", "location": "酒店", "estimated_cost": 0.0, "category": "relaxation"},
    ]

    interests = request.interests or [InterestPreference.CULTURE, InterestPreference.FOOD]
    daily_plans: List[DayPlan] = []
    total_cost = 0.0

    for day in range(1, request.days + 1):
        day_activities: List[Activity] = []
        
        day_activities.append(Activity(**default_activities[0]))
        
        interest_index = (day - 1) % len(interests)
        selected_interest = interests[interest_index].value
        
        if selected_interest in mock_activities:
            for activity_data in mock_activities[selected_interest]:
                day_activities.append(Activity(**activity_data))
        
        day_activities.append(Activity(**default_activities[1]))
        day_activities.append(Activity(**default_activities[2]))
        day_activities.append(Activity(**default_activities[3]))
        
        day_cost = sum(act.estimated_cost or 0 for act in day_activities)
        total_cost += day_cost
        
        daily_plans.append(DayPlan(
            day=day,
            activities=day_activities,
            summary=f"第 {day} 天：{request.destination} 深度体验之旅"
        ))

    budget_multiplier = 1.0
    if request.budget and request.budget > 0:
        budget_per_day = request.budget / request.days
        estimated_per_day = total_cost / request.days
        if estimated_per_day > budget_per_day:
            budget_multiplier = budget_per_day / estimated_per_day

    return ItineraryResponse(
        title=f"{request.departure} → {request.destination} {request.days}天{request.days - 1}晚深度游",
        departure=request.departure,
        destination=request.destination,
        days=request.days,
        estimated_total_cost=round(total_cost * budget_multiplier, 2),
        daily_plans=daily_plans,
        tips=[
            f"建议提前预订 {request.destination} 的住宿",
            "出行前检查天气预报，准备合适的衣物",
            "携带常用药品和个人护理用品",
            "了解当地风俗习惯，尊重当地文化",
            "建议购买旅行保险，保障旅途安全",
        ]
    )


class ItineraryService:
    def __init__(self):
        self.itineraries: List[ItineraryDetail] = []
        self.next_id: int = 1

    def _invalidate_cache(self, user_id: Optional[int] = None, itinerary_id: Optional[int] = None) -> None:
        cache_manager.delete(CACHE_KEY_ALL)
        if user_id is not None:
            cache_manager.delete(f"{CACHE_KEY_USER_PREFIX}{user_id}")
        if itinerary_id is not None:
            cache_manager.delete(f"{CACHE_KEY_DETAIL_PREFIX}{itinerary_id}")
        logger.info("[行程服务] 缓存已失效")
    
    def create_itinerary(self, itinerary_create: ItineraryCreate, user_id: int) -> ItineraryDetail:
        itinerary = ItineraryDetail(
            id=self.next_id,
            user_id=user_id,
            title=itinerary_create.title,
            departure=itinerary_create.departure,
            destination=itinerary_create.destination,
            days=itinerary_create.days,
            budget=itinerary_create.budget,
            estimated_total_cost=itinerary_create.estimated_total_cost,
            daily_plans=itinerary_create.daily_plans,
            tips=itinerary_create.tips,
            interests=[i.value for i in itinerary_create.interests] if itinerary_create.interests else [],
            travel_style=itinerary_create.travel_style,
            is_ai_generated=itinerary_create.is_ai_generated or False,
            created_at=datetime.now(),
            updated_at=None
        )
        self.itineraries.append(itinerary)
        self.next_id += 1
        self._invalidate_cache(user_id=user_id)
        logger.info(f"[行程服务] 创建行程: ID={itinerary.id}, 标题={itinerary.title}, 用户ID={user_id}, AI生成={itinerary.is_ai_generated}")
        return itinerary
    
    def get_all_itineraries(self) -> List[ItineraryDetail]:
        cached = cache_manager.get(CACHE_KEY_ALL)
        if cached is not None:
            logger.info(f"[行程服务] 缓存命中 - 获取所有行程列表，共 {len(cached)} 条")
            return cached
        
        logger.info(f"[行程服务] 缓存未命中 - 从数据库获取所有行程列表，共 {len(self.itineraries)} 条")
        result = deepcopy(self.itineraries)
        cache_manager.set(CACHE_KEY_ALL, result, ttl=CACHE_TTL)
        return result

    def get_itinerary_by_id(self, itinerary_id: int) -> Optional[ItineraryDetail]:
        cache_key = f"{CACHE_KEY_DETAIL_PREFIX}{itinerary_id}"
        cached = cache_manager.get(cache_key)
        if cached is not None:
            logger.info(f"[行程服务] 缓存命中 - 获取行程详情: ID={itinerary_id}")
            return cached
        
        for itinerary in self.itineraries:
            if itinerary.id == itinerary_id:
                logger.info(f"[行程服务] 缓存未命中 - 从数据库获取行程详情: ID={itinerary_id}")
                result = deepcopy(itinerary)
                cache_manager.set(cache_key, result, ttl=CACHE_TTL)
                return result
        logger.warning(f"[行程服务] 行程不存在: ID={itinerary_id}")
        return None

    def update_itinerary(self, itinerary_id: int, itinerary_update: ItineraryUpdate) -> Optional[ItineraryDetail]:
        itinerary = None
        for it in self.itineraries:
            if it.id == itinerary_id:
                itinerary = it
                break
        
        if itinerary is None:
            logger.warning(f"[行程服务] 更新失败，行程不存在: ID={itinerary_id}")
            return None
        
        user_id = itinerary.user_id
        update_data = itinerary_update.model_dump(exclude_unset=True)
        
        for key, value in update_data.items():
            if key == 'interests' and value is not None:
                value = [i.value if hasattr(i, 'value') else i for i in value]
            setattr(itinerary, key, value)
        
        itinerary.updated_at = datetime.now()
        self._invalidate_cache(user_id=user_id, itinerary_id=itinerary_id)
        logger.info(f"[行程服务] 更新行程: ID={itinerary_id}, 更新字段={list(update_data.keys())}")
        return itinerary

    def delete_itinerary(self, itinerary_id: int) -> bool:
        user_id: Optional[int] = None
        for i, itinerary in enumerate(self.itineraries):
            if itinerary.id == itinerary_id:
                user_id = itinerary.user_id
                deleted = self.itineraries.pop(i)
                self._invalidate_cache(user_id=user_id, itinerary_id=itinerary_id)
                logger.info(f"[行程服务] 删除行程: ID={itinerary_id}, 标题={deleted.title}")
                return True
        logger.warning(f"[行程服务] 删除失败，行程不存在: ID={itinerary_id}")
        return False

    def get_itineraries_by_user(self, user_id: int) -> List[ItineraryDetail]:
        cache_key = f"{CACHE_KEY_USER_PREFIX}{user_id}"
        cached = cache_manager.get(cache_key)
        if cached is not None:
            logger.info(f"[行程服务] 缓存命中 - 获取用户行程列表: 用户ID={user_id}, 共 {len(cached)} 条")
            return cached
        
        user_itineraries = [it for it in self.itineraries if it.user_id == user_id]
        logger.info(f"[行程服务] 缓存未命中 - 从数据库获取用户行程列表: 用户ID={user_id}, 共 {len(user_itineraries)} 条")
        result = deepcopy(user_itineraries)
        cache_manager.set(cache_key, result, ttl=CACHE_TTL)
        return result


class AIItenaryService:
    def __init__(self):
        self.mock_activities = {
            "culture": [
                {"time": "09:00-11:00", "name": "参观当地博物馆", "description": "了解当地历史文化", "location": "市中心博物馆", "estimated_cost": 50.0, "category": "culture"},
                {"time": "14:00-16:00", "name": "历史街区漫步", "description": "探索古老街道", "location": "老城区", "estimated_cost": 0.0, "category": "culture"},
            ],
            "nature": [
                {"time": "08:00-10:00", "name": "公园晨练", "description": "呼吸新鲜空气", "location": "城市公园", "estimated_cost": 0.0, "category": "nature"},
                {"time": "15:00-17:00", "name": "登山观景", "description": "俯瞰城市全景", "location": "近郊山脉", "estimated_cost": 20.0, "category": "nature"},
            ],
            "food": [
                {"time": "11:30-13:00", "name": "品尝当地特色午餐", "description": "体验地道美食", "location": "特色餐厅", "estimated_cost": 80.0, "category": "food"},
                {"time": "19:00-21:00", "name": "夜市小吃", "description": "体验当地夜生活", "location": "著名夜市", "estimated_cost": 50.0, "category": "food"},
            ],
            "shopping": [
                {"time": "10:00-12:00", "name": "购物中心逛街", "description": "购买纪念品", "location": "大型商场", "estimated_cost": 200.0, "category": "shopping"},
                {"time": "14:00-16:00", "name": "特色小店探索", "description": "发现独特商品", "location": "特色街区", "estimated_cost": 100.0, "category": "shopping"},
            ],
            "adventure": [
                {"time": "09:00-12:00", "name": "户外探险", "description": "刺激的户外活动", "location": "郊外", "estimated_cost": 150.0, "category": "adventure"},
                {"time": "14:00-17:00", "name": "水上活动", "description": "享受水上乐趣", "location": "水上乐园", "estimated_cost": 100.0, "category": "adventure"},
            ],
            "relaxation": [
                {"time": "10:00-12:00", "name": "温泉放松", "description": "舒缓身心", "location": "温泉度假村", "estimated_cost": 200.0, "category": "relaxation"},
                {"time": "15:00-17:00", "name": "SPA 体验", "description": "专业按摩护理", "location": "高端 SPA", "estimated_cost": 300.0, "category": "relaxation"},
            ],
        }

        self.default_activities = [
            {"time": "08:30-09:30", "name": "酒店早餐", "description": "享用丰盛早餐", "location": "酒店餐厅", "estimated_cost": 0.0, "category": "food"},
            {"time": "12:00-13:30", "name": "午餐", "description": "当地特色美食", "location": "推荐餐厅", "estimated_cost": 60.0, "category": "food"},
            {"time": "18:00-19:30", "name": "晚餐", "description": "浪漫晚餐", "location": "观景餐厅", "estimated_cost": 100.0, "category": "food"},
            {"time": "20:00-21:00", "name": "返回酒店休息", "description": "结束一天行程", "location": "酒店", "estimated_cost": 0.0, "category": "relaxation"},
        ]

    def generate_itinerary(self, request: ItineraryRequest) -> ItineraryResponse:
        logger.info(f"[AI服务] 开始生成行程: 目的地={request.destination}, 天数={request.days}")
        
        interests = request.interests or [InterestPreference.CULTURE, InterestPreference.FOOD]
        daily_plans: List[DayPlan] = []
        total_cost = 0.0

        for day in range(1, request.days + 1):
            day_activities: List[Activity] = []
            
            day_activities.append(Activity(**self.default_activities[0]))
            
            interest_index = (day - 1) % len(interests)
            selected_interest = interests[interest_index].value
            
            if selected_interest in self.mock_activities:
                for activity_data in self.mock_activities[selected_interest]:
                    day_activities.append(Activity(**activity_data))
            
            day_activities.append(Activity(**self.default_activities[1]))
            day_activities.append(Activity(**self.default_activities[2]))
            day_activities.append(Activity(**self.default_activities[3]))
            
            day_cost = sum(act.estimated_cost or 0 for act in day_activities)
            total_cost += day_cost
            
            daily_plans.append(DayPlan(
                day=day,
                activities=day_activities,
                summary=f"第 {day} 天：{request.destination} 深度体验之旅"
            ))

        budget_multiplier = 1.0
        if request.budget and request.budget > 0:
            budget_per_day = request.budget / request.days
            estimated_per_day = total_cost / request.days
            if estimated_per_day > budget_per_day:
                budget_multiplier = budget_per_day / estimated_per_day

        response = ItineraryResponse(
            title=f"{request.departure} → {request.destination} {request.days}天{request.days - 1}晚深度游",
            departure=request.departure,
            destination=request.destination,
            days=request.days,
            estimated_total_cost=round(total_cost * budget_multiplier, 2),
            daily_plans=daily_plans,
            tips=[
                f"建议提前预订 {request.destination} 的住宿",
                "出行前检查天气预报，准备合适的衣物",
                "携带常用药品和个人护理用品",
                "了解当地风俗习惯，尊重当地文化",
                "建议购买旅行保险，保障旅途安全",
            ]
        )
        
        logger.info(f"[AI服务] 行程生成完成: 标题={response.title}, 预估费用={response.estimated_total_cost}")
        return response

    def generate_and_save(self, request: ItineraryRequest, user_id: int) -> ItineraryDetail:
        logger.info(f"[AI服务] 开始生成并保存行程: 用户ID={user_id}, 目的地={request.destination}, 天数={request.days}")
        
        generated = self.generate_itinerary(request)
        
        itinerary_create = ItineraryCreate(
            title=generated.title,
            departure=generated.departure,
            destination=generated.destination,
            days=generated.days,
            budget=request.budget,
            estimated_total_cost=generated.estimated_total_cost,
            daily_plans=generated.daily_plans,
            tips=generated.tips or [],
            interests=request.interests or [],
            travel_style=request.travel_style,
            is_ai_generated=True
        )
        
        saved = itinerary_service.create_itinerary(itinerary_create, user_id)
        logger.info(f"[AI服务] 行程已保存到数据库: ID={saved.id}")
        
        return saved


itinerary_service = ItineraryService()
ai_itinerary_service = AIItenaryService()
