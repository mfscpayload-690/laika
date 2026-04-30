import httpx
import json
import os
import hashlib
from typing import Optional, Dict, Any
from core.config import get_settings

LRCLIB_BASE_URL = "https://lrclib.net/api"
CACHE_DIR = "cache/lyrics"

class LyricsService:
    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None
        if not os.path.exists(CACHE_DIR):
            os.makedirs(CACHE_DIR, exist_ok=True)

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=10.0,
                headers={"User-Agent": "LaikaMusic/0.1.0 (https://github.com/mfscpayload-690/laika-music)"}
            )
        return self._client

    def _get_cache_path(self, title: str, artist: str) -> str:
        key = f"{artist.lower()}_{title.lower()}"
        hash_key = hashlib.md5(key.encode()).hexdigest()
        return os.path.join(CACHE_DIR, f"{hash_key}.json")

    async def get_lyrics(self, title: str, artist: str, album: Optional[str] = None, duration_ms: int = 0) -> Optional[Dict[str, Any]]:
        """
        Fetches lyrics from LRCLIB. Supports synced (LRC) and plain text.
        """
        cache_path = self._get_cache_path(title, artist)
        
        # 1. Check Cache
        if os.path.exists(cache_path):
            try:
                with open(cache_path, "r") as f:
                    return json.load(f)
            except Exception:
                pass

        client = self._get_client()
        
        # 2. Attempt Exact Match
        params = {
            "track_name": title,
            "artist_name": artist,
        }
        if album:
            params["album_name"] = album
        if duration_ms > 0:
            params["duration"] = duration_ms // 1000

        try:
            response = await client.get(f"{LRCLIB_BASE_URL}/get", params=params)
            
            if response.status_code == 200:
                data = response.json()
                result = {
                    "plainLyrics": data.get("plainLyrics"),
                    "syncedLyrics": data.get("syncedLyrics"),
                    "instrumental": data.get("instrumental", False),
                }
                # Save to cache
                with open(cache_path, "w") as f:
                    json.dump(result, f)
                return result

            # 3. Fallback to Search if exact match failed
            search_query = f"{title} {artist}"
            search_res = await client.get(f"{LRCLIB_BASE_URL}/search", params={"q": search_query})
            
            if search_res.status_code == 200:
                results = search_res.json()
                if results:
                    # Pick the best result (usually the first one)
                    best = results[0]
                    result = {
                        "plainLyrics": best.get("plainLyrics"),
                        "syncedLyrics": best.get("syncedLyrics"),
                        "instrumental": best.get("instrumental", False),
                    }
                    with open(cache_path, "w") as f:
                        json.dump(result, f)
                    return result

        except Exception as e:
            print(f"LyricsService Error: {e}")
            
        return None

# Singleton instance
lyrics_service = LyricsService()
