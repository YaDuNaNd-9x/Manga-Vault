import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/search", tags=["Search"])

ANILIST_API = "https://graphql.anilist.co"

SEARCH_QUERY = """
query ($search: String, $type: MediaType) {
  Page(page: 1, perPage: 20) {
    media(search: $search, type: $type, sort: POPULARITY_DESC) {
      id
      title {
        romaji
        english
      }
      coverImage {
        large
      }
      description(asHtml: false)
      genres
      chapters
      averageScore
      status
      format
    }
  }
}
"""

DETAILS_QUERY = """
query ($id: Int) {
  Media(id: $id, type: MANGA) {
    id
    title {
      romaji
      english
    }
    coverImage {
      large
      extraLarge
    }
    bannerImage
    description(asHtml: false)
    genres
    chapters
    volumes
    averageScore
    meanScore
    popularity
    status
    format
    startDate { year month day }
    endDate { year month day }
    staff {
      edges {
        role
        node { name { full } }
      }
    }
    tags {
      name
      rank
    }
  }
}
"""


@router.get("")
async def search_manga(
    q: str = Query(..., description="Search query"),
    type: str = Query("MANGA", description="MANGA or MANHWA")
):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                ANILIST_API,
                json={
                    "query": SEARCH_QUERY,
                    "variables": {"search": q, "type": "MANGA"}
                },
                timeout=10.0
            )
            data = response.json()

            if "errors" in data:
                raise HTTPException(status_code=400, detail=data["errors"][0]["message"])

            media_list = data["data"]["Page"]["media"]

            # Clean up the response
            results = []
            for item in media_list:
                results.append({
                    "id": item["id"],
                    "title": item["title"]["english"] or item["title"]["romaji"],
                    "title_romaji": item["title"]["romaji"],
                    "cover_image": item["coverImage"]["large"],
                    "description": item.get("description", ""),
                    "genres": item.get("genres", []),
                    "chapters": item.get("chapters"),
                    "average_score": item.get("averageScore"),
                    "status": item.get("status"),
                    "format": item.get("format"),
                })

            return {"results": results, "total": len(results)}

        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="AniList API timed out")


@router.get("/{anilist_id}")
async def get_manga_details(anilist_id: int):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                ANILIST_API,
                json={
                    "query": DETAILS_QUERY,
                    "variables": {"id": anilist_id}
                },
                timeout=10.0
            )
            data = response.json()

            if "errors" in data:
                raise HTTPException(status_code=404, detail="Manga not found")

            item = data["data"]["Media"]

            return {
                "id": item["id"],
                "title": item["title"]["english"] or item["title"]["romaji"],
                "title_romaji": item["title"]["romaji"],
                "cover_image": item["coverImage"]["extraLarge"],
                "banner_image": item.get("bannerImage"),
                "description": item.get("description", ""),
                "genres": item.get("genres", []),
                "chapters": item.get("chapters"),
                "volumes": item.get("volumes"),
                "average_score": item.get("averageScore"),
                "popularity": item.get("popularity"),
                "status": item.get("status"),
                "format": item.get("format"),
                "tags": [t["name"] for t in item.get("tags", [])[:10]],
            }

        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="AniList API timed out")