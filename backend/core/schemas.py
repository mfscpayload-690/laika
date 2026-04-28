from typing import List, Optional
from pydantic import BaseModel


class Track(BaseModel):
    id: str
    title: str
    artist: str
    album: Optional[str] = None
    duration_ms: int
    thumbnail: Optional[str] = None
    source: str
    match_score: Optional[float] = None
    youtube_id: Optional[str] = None
    youtube_url: Optional[str] = None


class SearchResponse(BaseModel):
    query: str
    tracks: List[Track]
