from fastapi import APIRouter, Query

from core.schemas import SearchResponse
from services.youtube_service import youtube_service

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50)
):
    """
    Search for tracks on YouTube (Primary Source).
    """
    tracks = await youtube_service.search_tracks(q, limit=limit)
    return SearchResponse(query=q, tracks=tracks)
