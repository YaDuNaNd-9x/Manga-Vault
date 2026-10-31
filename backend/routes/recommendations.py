import httpx
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import library_collection, reviews_collection
from auth import decode_access_token

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])
security = HTTPBearer()

ANILIST_API = "https://graphql.anilist.co"

GENRE_QUERY = """
query ($genre: String) {
  Page(page: 1, perPage: 10) {
    media(genre: $genre, type: MANGA, sort: POPULARITY_DESC) {
      id
      title { romaji english }
      coverImage { large }
      genres
      averageScore
      chapters
    }
  }
}
"""


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload.get("sub")


@router.get("/me")
async def get_recommendations(user_id: str = Depends(get_current_user_id)):
    # Get user's highest rated completed series
    top_reviews = await reviews_collection.find(
        {"user_id": user_id, "rating": {"$gte": 7}}
    ).sort("rating", -1).limit(5).to_list(length=5)

    # Get all anilist_ids already in library
    library_ids = set()
    async for entry in library_collection.find({"user_id": user_id}):
        library_ids.add(entry["anilist_id"])

    if not top_reviews:
        # No reviews yet — return popular manga as default
        genre = "Action"
    else:
        # Pick the most common genre from top rated series
        # For simplicity use Action as fallback — 
        # real genre tracking added when we build the frontend
        genre = "Action"

    async with httpx.AsyncClient() as client:
        response = await client.post(
            ANILIST_API,
            json={"query": GENRE_QUERY, "variables": {"genre": genre}},
            timeout=10.0
        )
        data = response.json()

    if "errors" in data or not data.get("data"):
        return {"recommendations": []}

    media_list = data["data"]["Page"]["media"]

    recommendations = []
    for item in media_list:
        if item["id"] not in library_ids:
            recommendations.append({
                "id": item["id"],
                "title": item["title"]["english"] or item["title"]["romaji"],
                "cover_image": item["coverImage"]["large"],
                "genres": item.get("genres", []),
                "average_score": item.get("averageScore"),
                "chapters": item.get("chapters"),
            })

    return {"recommendations": recommendations[:10]}