from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import library_collection, reviews_collection
from auth import decode_access_token

router = APIRouter(prefix="/stats", tags=["Stats"])
security = HTTPBearer()


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload.get("sub")


@router.get("/me")
async def get_my_stats(user_id: str = Depends(get_current_user_id)):
    entries = []
    async for entry in library_collection.find({"user_id": user_id}):
        entries.append(entry)

    reviews = []
    async for review in reviews_collection.find({"user_id": user_id}):
        reviews.append(review)

    total_series = len(entries)
    completed = [e for e in entries if e["status"] == "Completed"]
    reading = [e for e in entries if e["status"] == "Reading"]
    plan_to_read = [e for e in entries if e["status"] == "Plan to Read"]
    dropped = [e for e in entries if e["status"] == "Dropped"]

    total_chapters = sum(e.get("current_chapter", 0) for e in entries)
    completion_rate = round(len(completed) / total_series * 100) if total_series > 0 else 0

    avg_rating = None
    if reviews:
        avg_rating = round(sum(r["rating"] for r in reviews) / len(reviews), 1)

    status_breakdown = {
        "Reading": len(reading),
        "Completed": len(completed),
        "Plan to Read": len(plan_to_read),
        "Dropped": len(dropped)
    }

    top_rated = sorted(reviews, key=lambda r: r["rating"], reverse=True)[:5]
    top_rated_list = [{"title": r["title"], "rating": r["rating"]} for r in top_rated]

    return {
        "total_series": total_series,
        "total_chapters_read": total_chapters,
        "completion_rate": completion_rate,
        "average_rating": avg_rating,
        "status_breakdown": status_breakdown,
        "total_reviews": len(reviews),
        "top_rated": top_rated_list
    }