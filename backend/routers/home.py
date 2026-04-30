from fastapi import APIRouter
from typing import List
import asyncio
from core.schemas import HomeResponse, HomeSection, Track
from services.deezer_service import deezer_service
from services.saavn_service import saavn_service

router = APIRouter(prefix="/home", tags=["home"])

@router.get("/", response_model=HomeResponse)
async def get_home():
    """
    Fetches mixed content for the home dashboard.
    """
    
    # 1. Fetch Global Charts (Deezer)
    # 2. Fetch Trending Hindi (Saavn)
    # 3. Fetch Top Punjabi (Saavn)
    # 4. Fetch Quick Picks (Recent/Mock for now, but real tracks)
    
    tasks = [
        deezer_service.get_charts(limit=10),
        saavn_service.search_tracks("Trending Hindi", limit=10),
        saavn_service.search_tracks("Top Punjabi", limit=10),
        saavn_service.search_tracks("Malayalam Top 10", limit=10),
    ]
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    global_charts = results[0] if isinstance(results[0], list) else []
    trending_hindi = results[1] if isinstance(results[1], list) else []
    top_punjabi = results[2] if isinstance(results[2], list) else []
    top_malayalam = results[3] if isinstance(results[3], list) else []
    
    sections = []
    
    if global_charts:
        sections.append(HomeSection(
            title="Global Top Hits",
            type="carousel",
            items=global_charts
        ))
        
    if trending_hindi:
        sections.append(HomeSection(
            title="Trending in India",
            type="carousel",
            items=trending_hindi
        ))
        
    if top_punjabi:
        sections.append(HomeSection(
            title="Popular Punjabi",
            type="carousel",
            items=top_punjabi
        ))

    if top_malayalam:
        sections.append(HomeSection(
            title="Malayalam Melodies",
            type="carousel",
            items=top_malayalam
        ))
        
    return HomeResponse(sections=sections)
