from fastapi import FastAPI

from routers.health import router as health_router
from routers.search import router as search_router
from routers.resolve import router as resolve_router
from routers.home import router as home_router
from routers.lyrics import router as lyrics_router
from routers.events import router as events_router
from routers.playlists import router as playlists_router
from core.database import Base, engine
from models.user_event import UserEvent
from models.playlist import Playlist, PlaylistTrack # Import models to ensure they are registered

# Create tables
Base.metadata.create_all(bind=engine)


def create_app() -> FastAPI:
    app = FastAPI(title="Laika Music Backend", version="0.1.0")
    app.include_router(health_router)
    app.include_router(search_router)
    app.include_router(resolve_router)
    app.include_router(home_router)
    app.include_router(lyrics_router)
    app.include_router(events_router)
    app.include_router(playlists_router)
    return app


app = create_app()
