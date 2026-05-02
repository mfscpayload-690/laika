from fastapi import APIRouter, Query, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from services.lyrics_service import lyrics_service

router = APIRouter(prefix="/lyrics", tags=["lyrics"])

class LyricsRequest(BaseModel):
    title: str
    artist: str
    album: Optional[str] = None
    duration_ms: Optional[int] = 0

class LyricsResponse(BaseModel):
    plainLyrics: Optional[str] = None
    syncedLyrics: Optional[str] = None
    instrumental: bool = False

@router.get("/", response_model=LyricsResponse)
async def get_track_lyrics(
    title: str = Query(...),
    artist: str = Query(...),
    album: Optional[str] = Query(None),
    duration_ms: int = Query(0)
):
    """
    Fetches lyrics for a track based on metadata.
    """
    lyrics = await lyrics_service.get_lyrics(title, artist, album, duration_ms)
    
    if not lyrics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lyrics not found for this track"
        )
        
    return LyricsResponse(**lyrics)
