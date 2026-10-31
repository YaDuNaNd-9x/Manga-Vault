from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class LibraryEntryCreate(BaseModel):
    anilist_id: int
    title: str
    cover_image: Optional[str] = None
    status: str  # "Reading", "Completed", "Plan to Read", "Dropped"
    current_chapter: int = 0
    total_chapters: Optional[int] = None


class LibraryEntryUpdate(BaseModel):
    status: Optional[str] = None
    current_chapter: Optional[int] = None
    total_chapters: Optional[int] = None
    finish_date: Optional[str] = None


class LibraryEntryResponse(BaseModel):
    id: str
    user_id: str
    anilist_id: int
    title: str
    cover_image: Optional[str] = None
    status: str
    current_chapter: int
    total_chapters: Optional[int] = None
    start_date: Optional[str] = None
    finish_date: Optional[str] = None