from fastapi import APIRouter, Query

from core.schemas import SearchResponse
from services.search_service import meta_search_service

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/", response_model=SearchResponse)
async def search(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50)
):
    """
    Search for tracks across multiple high-quality sources (Saavn, Deezer, YouTube).
    """
    tracks = await meta_search_service.search_tracks(q, limit=limit)
    return SearchResponse(query=q, tracks=tracks)
