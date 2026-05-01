from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from core.database import get_db
from models.user_event import UserEvent
from typing import List, Optional
import asyncio
import datetime
from core.schemas import HomeResponse, HomeSection, Track
from services.deezer_service import deezer_service
from services.saavn_service import saavn_service

router = APIRouter(prefix="/home", tags=["home"])

@router.get("/", response_model=HomeResponse)
async def get_home(
    user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Fetches mixed content for the home dashboard.
    """
    
    # 0. Fetch Recently Played from DB
    query = db.query(UserEvent).filter(UserEvent.action == "play")
    if user_id:
        query = query.filter(UserEvent.user_id == user_id)
    else:
        query = query.filter(UserEvent.user_id == None)
        
    recent_events = query.order_by(UserEvent.timestamp.desc()).limit(50).all()
    
    # Deduplicate by track_id
    seen_ids = set()
    recent_tracks = []
    for event in recent_events:
        if event.track_id not in seen_ids:
            recent_tracks.append(Track(
                id=event.track_id,
                title=event.title,
                artist=event.artist,
                thumbnail=event.thumbnail,
                source=event.source or "unknown",
                duration_ms=0 # We don't store duration yet
            ))
            seen_ids.add(event.track_id)
        if len(recent_tracks) >= 8:
            break

    # 1. Fetch Global Charts (Deezer)
    # 2. Fetch Trending Hindi (Saavn)
    # 3. Fetch Top Punjabi (Saavn)
    # 4. Fetch Quick Picks (Recent/Mock for now, but real tracks)
    
    async def fetch_with_timeout(task, timeout=5.0):
        try:
            return await asyncio.wait_for(task, timeout=timeout)
        except Exception as e:
            print(f"DEBUG: Home fetch timeout/error: {e}")
            return []

    tasks = [
        fetch_with_timeout(deezer_service.get_charts(limit=10)),
        fetch_with_timeout(saavn_service.search_tracks("Trending Hindi", limit=10)),
        fetch_with_timeout(saavn_service.search_tracks("Top Punjabi", limit=10)),
        fetch_with_timeout(saavn_service.search_tracks("Malayalam Top 10", limit=10)),
    ]
    
    results = await asyncio.gather(*tasks)
    
    global_charts = results[0] if isinstance(results[0], list) else []
    trending_hindi = results[1] if isinstance(results[1], list) else []
    top_punjabi = results[2] if isinstance(results[2], list) else []
    top_malayalam = results[3] if isinstance(results[3], list) else []
    
    sections = []

    if recent_tracks:
        sections.append(HomeSection(
            title="Jump Back In",
            type="grid",
            items=recent_tracks
        ))

    seven_days_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
    mp_query = db.query(
        UserEvent.track_id, 
        UserEvent.title, 
        UserEvent.artist, 
        UserEvent.thumbnail,
        UserEvent.source,
        func.count(UserEvent.id).label('play_count')
    ).filter(
        UserEvent.action == "play",
        UserEvent.timestamp >= seven_days_ago
    )
    
    if user_id:
        mp_query = mp_query.filter(UserEvent.user_id == user_id)
    else:
        mp_query = mp_query.filter(UserEvent.user_id == None)

    most_played_events = mp_query.group_by(
        UserEvent.track_id, 
        UserEvent.title, 
        UserEvent.artist, 
        UserEvent.thumbnail, 
        UserEvent.source
    ).order_by(func.count(UserEvent.id).desc()).limit(8).all()

    if most_played_events:
        sections.append(HomeSection(
            title="Most Played This Week",
            type="carousel",
            items=[Track(
                id=e.track_id,
                title=e.title,
                artist=e.artist,
                thumbnail=e.thumbnail,
                source=e.source or "unknown",
                duration_ms=0
            ) for e in most_played_events]
        ))
    
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
