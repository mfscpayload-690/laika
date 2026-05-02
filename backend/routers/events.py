from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.database import get_db
from models.user_event import UserEvent
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/events", tags=["events"])

class EventCreate(BaseModel):
    track_id: str
    title: str
    artist: str
    action: str
    thumbnail: Optional[str] = None
    source: Optional[str] = None
    user_id: Optional[str] = None
    metadata: Optional[dict] = None

@router.post("/")
async def create_event(event: EventCreate, db: Session = Depends(get_db)):
    db_event = UserEvent(
        user_id=event.user_id,
        track_id=event.track_id,
        title=event.title,
        artist=event.artist,
        action=event.action,
        thumbnail=event.thumbnail,
        source=event.source,
        metadata_json=event.metadata
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return {"status": "ok", "event_id": db_event.id}
