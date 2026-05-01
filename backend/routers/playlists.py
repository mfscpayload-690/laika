from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from core.database import get_db
from models.playlist import Playlist, PlaylistTrack
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/playlists", tags=["playlists"])

class PlaylistCreate(BaseModel):
    name: str
    description: Optional[str] = None
    user_id: str

class PlaylistAddTrack(BaseModel):
    track_id: str
    title: str
    artist: str
    thumbnail: Optional[str] = None
    source: Optional[str] = None

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_playlist(data: PlaylistCreate, db: Session = Depends(get_db)):
    playlist = Playlist(
        name=data.name,
        description=data.description,
        user_id=data.user_id
    )
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return playlist

@router.get("/")
async def get_playlists(user_id: str, db: Session = Depends(get_db)):
    playlists = db.query(Playlist).filter(Playlist.user_id == user_id).all()
    return playlists

@router.get("/{playlist_id}")
async def get_playlist(playlist_id: str, db: Session = Depends(get_db)):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Return playlist with tracks in a format compatible with our Track schema
    return {
        "id": playlist.id,
        "name": playlist.name,
        "description": playlist.description,
        "thumbnail": playlist.thumbnail,
        "tracks": [
            {
                "id": t.track_id,
                "title": t.title,
                "artist": t.artist,
                "thumbnail": t.thumbnail,
                "source": t.source or "unknown",
                "duration_ms": 0 # We don't store duration in playlist_tracks yet
            } for t in playlist.tracks
        ]
    }

@router.post("/{playlist_id}/tracks")
async def add_track_to_playlist(playlist_id: str, data: PlaylistAddTrack, db: Session = Depends(get_db)):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    # Check if track already exists in playlist to avoid duplicates
    exists = db.query(PlaylistTrack).filter(
        PlaylistTrack.playlist_id == playlist_id,
        PlaylistTrack.track_id == data.track_id
    ).first()
    
    if exists:
        return {"message": "Track already in playlist"}

    new_track = PlaylistTrack(
        playlist_id=playlist_id,
        track_id=data.track_id,
        title=data.title,
        artist=data.artist,
        thumbnail=data.thumbnail,
        source=data.source
    )
    db.add(new_track)
    
    # Update playlist thumbnail if it doesn't have one (auto-branding)
    if not playlist.thumbnail and data.thumbnail:
        playlist.thumbnail = data.thumbnail
        
    db.commit()
    return {"message": "Track added successfully"}

@router.delete("/{playlist_id}")
async def delete_playlist(playlist_id: str, db: Session = Depends(get_db)):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    
    db.delete(playlist)
    db.commit()
    return {"message": "Playlist deleted"}

@router.delete("/{playlist_id}/tracks/{track_id}")
async def remove_track_from_playlist(playlist_id: str, track_id: str, db: Session = Depends(get_db)):
    track = db.query(PlaylistTrack).filter(
        PlaylistTrack.playlist_id == playlist_id,
        PlaylistTrack.track_id == track_id
    ).first()
    
    if not track:
        raise HTTPException(status_code=404, detail="Track not found in playlist")
    
    db.delete(track)
    db.commit()
    return {"message": "Track removed"}
