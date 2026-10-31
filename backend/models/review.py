from pydantic import BaseModel
from typing import Optional


class ReviewCreate(BaseModel):
    anilist_id: int
    title: str
    rating: int      # 1-10
    review_text: Optional[str] = None


class ReviewResponse(BaseModel):
    id: str
    user_id: str
    username: str
    anilist_id: int
    title: str
    rating: int
    review_text: Optional[str] = None
    created_at: Optional[str] = None