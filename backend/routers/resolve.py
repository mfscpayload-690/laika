from typing import Optional
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

@router.api_route("/", methods=["GET", "POST"], response_model=ResolveResponse)
@router.api_route("", methods=["GET", "POST"], response_model=ResolveResponse, include_in_schema=False)
async def resolve_track(
    request: Optional[ResolveRequest] = None,
    title: Optional[str] = None,
    artist: Optional[str] = None,
    duration: Optional[int] = None
):
    """
    Resolves a track to a YouTube audio URL. Supports POST (JSON) or GET (Query params).
    """
    # Handle POST data or GET params
    r_title = title or (request.title if request else None)
    r_artist = artist or (request.artist if request else None)
    r_duration = duration or (request.duration if request else None)

    if not r_title or not r_artist:
        raise HTTPException(status_code=400, detail="Missing title or artist")

    track = Track(
        id="resolve-request",
        title=r_title,
        artist=r_artist,
        duration_ms=r_duration or 0,
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
    youtube_service.set_resolution(r_title, r_artist, best_candidate["url"])

    # 4. Extract actual audio URL using yt-dlp
    extracted = await youtube_service.extract_audio_url(best_candidate["url"])

    return ResolveResponse(
        url=extracted["url"],
        title=extracted["title"],
        duration=int(extracted["duration"])
    )
