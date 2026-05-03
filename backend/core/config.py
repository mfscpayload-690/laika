from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "laika-music-backend"
    environment: str = "development"
    youtube_api_key: str = ""
    youtube_po_token: str | None = None
    youtube_visitor_data: str | None = None
    piped_instances: list[str] = [
        "https://pipedapi.kavin.rocks",
        "https://pipedapi.adminforge.de",
        "https://pipedapi.hostux.net",
        "https://pipedapi.moomoo.me",
        "https://pipedapi.leptons.xyz",
        "https://pipedapi.privacydev.net",
        "https://api-piped.mha.fi",
        "https://pipedapi.reillyhoward.com",
        "https://pipedapi.v0l.me",
        "https://pipedapi.garnet.ovh",
        "https://pipedapi.us.to",
        "https://pipedapi.drgns.space"
    ]
    invidious_instances: list[str] = [
        "https://yewtu.be",
        "https://invidious.snopyta.org",
        "https://invidious.flokinet.to",
        "https://invidious.sethforprivacy.com",
        "https://inv.riverside.rocks",
        "https://invidious.namazso.eu",
        "https://invidious.privacydev.net",
        "https://invidious.esmailelbob.xyz"
    ]
    supabase_jwt_secret: str | None = None
    supabase_jwt_audience: str = "authenticated"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
