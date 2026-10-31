from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.library import LibraryEntryCreate, LibraryEntryUpdate, LibraryEntryResponse
from database import library_collection
from auth import decode_access_token
from bson import ObjectId
from datetime import datetime, timezone
from typing import List

router = APIRouter(prefix="/library", tags=["Library"])
security = HTTPBearer()


def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    return payload.get("sub")


@router.post("/add", response_model=LibraryEntryResponse, status_code=201)
async def add_to_library(entry: LibraryEntryCreate, user_id: str = Depends(get_current_user_id)):
    # Check if already in library
    existing = await library_collection.find_one({
        "user_id": user_id,
        "anilist_id": entry.anilist_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Already in your library")

    now = datetime.now(timezone.utc).isoformat()
    new_entry = {
        "user_id": user_id,
        "anilist_id": entry.anilist_id,
        "title": entry.title,
        "cover_image": entry.cover_image,
        "status": entry.status,
        "current_chapter": entry.current_chapter,
        "total_chapters": entry.total_chapters,
        "start_date": now,
        "finish_date": None,
        "updated_at": now
    }

    result = await library_collection.insert_one(new_entry)

    return LibraryEntryResponse(
        id=str(result.inserted_id),
        user_id=user_id,
        anilist_id=entry.anilist_id,
        title=entry.title,
        cover_image=entry.cover_image,
        status=entry.status,
        current_chapter=entry.current_chapter,
        total_chapters=entry.total_chapters,
        start_date=now
    )


@router.get("", response_model=List[LibraryEntryResponse])
async def get_library(user_id: str = Depends(get_current_user_id)):
    entries = []
    cursor = library_collection.find({"user_id": user_id})
    async for entry in cursor:
        entries.append(LibraryEntryResponse(
            id=str(entry["_id"]),
            user_id=entry["user_id"],
            anilist_id=entry["anilist_id"],
            title=entry["title"],
            cover_image=entry.get("cover_image"),
            status=entry["status"],
            current_chapter=entry["current_chapter"],
            total_chapters=entry.get("total_chapters"),
            start_date=entry.get("start_date"),
            finish_date=entry.get("finish_date")
        ))
    return entries


@router.patch("/{entry_id}/progress", response_model=LibraryEntryResponse)
async def update_progress(
    entry_id: str,
    update_data: LibraryEntryUpdate,
    user_id: str = Depends(get_current_user_id)
):
    # Validate MongoDB ID
    if not ObjectId.is_valid(entry_id):
        raise HTTPException(status_code=400, detail="Invalid entry ID")

    entry = await library_collection.find_one({
        "_id": ObjectId(entry_id),
        "user_id": user_id
    })

    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    now = datetime.now(timezone.utc).isoformat()

    update_fields = {
        "updated_at": now
    }

    # Update status
    if update_data.status is not None:
        update_fields["status"] = update_data.status

    # Update total chapters if supplied
    total_chapters = update_data.total_chapters

    if total_chapters is None:
        total_chapters = entry.get("total_chapters")

    if update_data.total_chapters is not None:
        update_fields["total_chapters"] = update_data.total_chapters

    # Update chapter progress
    if update_data.current_chapter is not None:
        update_fields["current_chapter"] = update_data.current_chapter

    # AUTOMATIC COMPLETION LOGIC
    if update_data.status == "Completed":

        if total_chapters is not None:
            update_fields["current_chapter"] = total_chapters

        if not entry.get("finish_date"):
            update_fields["finish_date"] = now

    elif update_data.finish_date is not None:
        update_fields["finish_date"] = update_data.finish_date

    # Save changes
    await library_collection.update_one(
        {
            "_id": ObjectId(entry_id),
            "user_id": user_id
        },
        {"$set": update_fields}
    )

    updated = await library_collection.find_one({
        "_id": ObjectId(entry_id),
        "user_id": user_id
    })

    return LibraryEntryResponse(
        id=str(updated["_id"]),
        user_id=updated["user_id"],
        anilist_id=updated["anilist_id"],
        title=updated["title"],
        cover_image=updated.get("cover_image"),
        status=updated["status"],
        current_chapter=updated["current_chapter"],
        total_chapters=updated.get("total_chapters"),
        start_date=updated.get("start_date"),
        finish_date=updated.get("finish_date")
    )


@router.delete("/{entry_id}", status_code=204)
async def remove_from_library(entry_id: str, user_id: str = Depends(get_current_user_id)):
    result = await library_collection.delete_one({
        "_id": ObjectId(entry_id),
        "user_id": user_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")