import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/mangadex", tags=["MangaDex"])

MANGADEX_API = "https://api.mangadex.org"


@router.get("/chapters/{title}")
async def get_latest_chapter(title: str):
    async with httpx.AsyncClient() as client:
        try:
            # Search for the manga by title
            search_res = await client.get(
                f"{MANGADEX_API}/manga",
                params={
                    "title": title,
                    "limit": 1,
                    "order[relevance]": "desc"
                },
                timeout=10.0
            )
            search_data = search_res.json()

            if not search_data["data"]:
                return {"latest_chapter": None, "found": False}

            manga_id = search_data["data"][0]["id"]
            manga_title = (
                search_data["data"][0]["attributes"]["title"].get("en")
                or list(search_data["data"][0]["attributes"]["title"].values())[0]
                or title
            )

            # Try English first
            chapters_res = await client.get(
                f"{MANGADEX_API}/manga/{manga_id}/feed",
                params={
                    "translatedLanguage[]": "en",
                    "order[chapter]": "desc",
                    "limit": 5,
                },
                timeout=10.0
            )
            chapters_data = chapters_res.json()

            # If no English chapters, try any language
            if not chapters_data["data"]:
                chapters_res = await client.get(
                    f"{MANGADEX_API}/manga/{manga_id}/feed",
                    params={
                        "order[chapter]": "desc",
                        "limit": 5,
                    },
                    timeout=10.0
                )
                chapters_data = chapters_res.json()

            if not chapters_data["data"]:
                # Last resort — get chapter count from manga attributes
                manga_res = await client.get(
                    f"{MANGADEX_API}/manga/{manga_id}",
                    timeout=10.0
                )
                manga_data = manga_res.json()
                last_chapter = manga_data["data"]["attributes"].get("lastChapter")
                if last_chapter:
                    try:
                        return {
                            "latest_chapter": int(float(last_chapter)),
                            "found": True,
                            "manga_id": manga_id,
                            "manga_title": manga_title,
                            "source": "manga_attributes"
                        }
                    except (ValueError, TypeError):
                        pass
                return {"latest_chapter": None, "found": True, "manga_id": manga_id}

            # Find the highest chapter number from results
            latest = None
            for ch in chapters_data["data"]:
                ch_num = ch["attributes"].get("chapter")
                if ch_num:
                    try:
                        num = int(float(ch_num))
                        if latest is None or num > latest:
                            latest = num
                    except (ValueError, TypeError):
                        continue

            return {
                "latest_chapter": latest,
                "found": True,
                "manga_id": manga_id,
                "manga_title": manga_title,
                "source": "chapter_feed"
            }

        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="MangaDex API timed out")
        except Exception as e:
            return {"latest_chapter": None, "found": False, "error": str(e)}