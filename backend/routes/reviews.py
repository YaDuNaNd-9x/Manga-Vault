from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.review import ReviewCreate, ReviewResponse
from database import reviews_collection, users_collection
from auth import decode_access_token
from bson import ObjectId
from datetime import datetime, timezone
from typing import List

router = APIRouter(prefix="/reviews", tags=["Reviews"])
security = HTTPBearer()


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload.get("sub")


@router.post("/", response_model=ReviewResponse, status_code=201)
async def create_review(review: ReviewCreate, user_id: str = Depends(get_current_user_id)):
    if not 1 <= review.rating <= 10:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 10")

    existing = await reviews_collection.find_one({
        "user_id": user_id,
        "anilist_id": review.anilist_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this series")

    user = await users_collection.find_one({"_id": ObjectId(user_id)})
    username = user["username"] if user else "Unknown"

    now = datetime.now(timezone.utc).isoformat()
    new_review = {
        "user_id": user_id,
        "username": username,
        "anilist_id": review.anilist_id,
        "title": review.title,
        "rating": review.rating,
        "review_text": review.review_text,
        "created_at": now
    }

    result = await reviews_collection.insert_one(new_review)

    return ReviewResponse(
        id=str(result.inserted_id),
        user_id=user_id,
        username=username,
        anilist_id=review.anilist_id,
        title=review.title,
        rating=review.rating,
        review_text=review.review_text,
        created_at=now
    )


@router.get("/manga/{anilist_id}", response_model=List[ReviewResponse])
async def get_manga_reviews(anilist_id: int):
    reviews = []
    cursor = reviews_collection.find({"anilist_id": anilist_id}).sort("created_at", -1)
    async for review in cursor:
        reviews.append(ReviewResponse(
            id=str(review["_id"]),
            user_id=review["user_id"],
            username=review.get("username", "Unknown"),
            anilist_id=review["anilist_id"],
            title=review["title"],
            rating=review["rating"],
            review_text=review.get("review_text"),
            created_at=review.get("created_at")
        ))
    return reviews


@router.get("/user/me", response_model=List[ReviewResponse])
async def get_my_reviews(user_id: str = Depends(get_current_user_id)):
    reviews = []
    cursor = reviews_collection.find({"user_id": user_id}).sort("created_at", -1)
    async for review in cursor:
        reviews.append(ReviewResponse(
            id=str(review["_id"]),
            user_id=review["user_id"],
            username=review.get("username", "Unknown"),
            anilist_id=review["anilist_id"],
            title=review["title"],
            rating=review["rating"],
            review_text=review.get("review_text"),
            created_at=review.get("created_at")
        ))
    return reviews


@router.delete("/{review_id}", status_code=204)
async def delete_review(review_id: str, user_id: str = Depends(get_current_user_id)):
    result = await reviews_collection.delete_one({
        "_id": ObjectId(review_id),
        "user_id": user_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")