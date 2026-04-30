from sqlalchemy import Column, Integer, String, DateTime, JSON
from core.database import Base
import datetime

class UserEvent(Base):
    __tablename__ = "user_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=True)  # Nullable for Guest mode
    track_id = Column(String, index=True)
    artist = Column(String, index=True)
    title = Column(String)
    action = Column(String)  # "play", "complete", "skip"
    thumbnail = Column(String, nullable=True)
    source = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    metadata_json = Column(JSON, nullable=True)
