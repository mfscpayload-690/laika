from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from core.schemas import Track
from services.youtube_service import youtube_service
from services.matching_service import matching_service

router = APIRouter(prefix="/resolve", tags=["resolve"])

class ResolveRequest(BaseModel):
    title: str
    artist: str
    duration: int

class ResolveResponse(BaseModel):
    url: str
    title: str
    duration: int

@router.post("/", response_model=ResolveResponse)
async def resolve_track(request: ResolveRequest):
    """
    Resolves a track (metadata) to a YouTube audio URL.
    """
    track = Track(
        id="resolve-request",
        title=request.title,
        artist=request.artist,
        duration_ms=request.duration,
        source="youtube"
    )
    candidates = await youtube_service.search_youtube(track)
    
    if not candidates:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No YouTube candidates found for this track"
        )
    # 3. Match best candidate
    best_candidate = matching_service.select_best_candidate(track, candidates)
    
    if not best_candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Could not find a suitable audio match"
        )

    # 3.5 Populate resolution cache for near-instant search skip next time
    youtube_service.set_resolution(request.title, request.artist, best_candidate["url"])

    # 4. Extract actual audio URL using yt-dlp
    extracted = await youtube_service.extract_audio_url(best_candidate["url"])

    return ResolveResponse(
        url=extracted["url"],
        title=extracted["title"],
        duration=int(extracted["duration"])
    )
