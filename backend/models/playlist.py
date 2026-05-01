from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base
import datetime
import uuid

class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    thumbnail = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    tracks = relationship("PlaylistTrack", back_populates="playlist", cascade="all, delete-orphan")

class PlaylistTrack(Base):
    __tablename__ = "playlist_tracks"

    id = Column(Integer, primary_key=True, index=True)
    playlist_id = Column(String, ForeignKey("playlists.id"), index=True)
    track_id = Column(String, index=True, nullable=False)
    title = Column(String, nullable=False)
    artist = Column(String, nullable=False)
    thumbnail = Column(String, nullable=True)
    source = Column(String, nullable=True)
    added_at = Column(DateTime, default=datetime.datetime.utcnow)

    playlist = relationship("Playlist", back_populates="tracks")
