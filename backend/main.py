from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router
from routes.library import router as library_router
from routes.search import router as search_router
from routes.reviews import router as reviews_router
from routes.stats import router as stats_router
from routes.mangadex import router as mangadex_router
from routes.recommendations import router as recommendations_router

app = FastAPI(
    title="MangaVault API",
    description="Backend API for MangaVault manga tracking platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(library_router)
app.include_router(search_router)
app.include_router(reviews_router)
app.include_router(stats_router)
app.include_router(mangadex_router)
app.include_router(recommendations_router)


@app.get("/")
async def root():
    return {"message": "MangaVault API is running"}