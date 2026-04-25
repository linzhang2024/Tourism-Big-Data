from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.itinerary import router as itinerary_router

app = FastAPI(
    title="智能旅游行程规划 API",
    description="基于 AI 的智能旅游行程规划平台后端 API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(itinerary_router, prefix="/api/itinerary", tags=["行程规划"])


@app.get("/")
async def root():
    return {"message": "智能旅游行程规划 API 服务运行中"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
