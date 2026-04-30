import httpx
from typing import List, Optional
from core.schemas import Track

DEEZER_SEARCH_URL = "https://api.deezer.com/search"

class DeezerService:
    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=10.0,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"}
            )
        return self._client

    async def search_tracks(self, query: str, limit: int = 15) -> List[Track]:
        """
        Search for tracks on Deezer to get high-quality international metadata.
        """
        client = self._get_client()
        params = {
            "q": query,
            "limit": limit
        }

        try:
            response = await client.get(DEEZER_SEARCH_URL, params=params)
            if response.status_code != 200:
                return []

            data = response.json()
            items = data.get("data", [])
            
            tracks = []
            for item in items:
                # Deezer provides high-res covers in cover_xl (1000x1000)
                artwork = item.get("album", {}).get("cover_xl") or item.get("album", {}).get("cover_big")
                
                tracks.append(Track(
                    id=f"deezer_{item['id']}",
                    title=item.get("title", "Unknown"),
                    artist=item.get("artist", {}).get("name", "Unknown"),
                    album=item.get("album", {}).get("title"),
                    duration_ms=item.get("duration", 0) * 1000,
                    thumbnail=artwork,
                    source="deezer",
                    # We store the metadata so the matcher can find it on YT later
                    metadata={
                        "isrc": item.get("isrc"),
                        "deezer_id": item.get("id"),
                        "album_id": item.get("album", {}).get("id")
                    }
                ))
            return tracks
        except Exception as e:
            print(f"DeezerService Error: {e}")
            return []

    async def get_charts(self, limit: int = 10) -> List[Track]:
        """
        Fetch top global tracks from Deezer Charts.
        """
        client = self._get_client()
        try:
            response = await client.get("https://api.deezer.com/chart/0/tracks", params={"limit": limit})
            if response.status_code != 200:
                return []
            
            data = response.json()
            items = data.get("data", [])
            
            tracks = []
            for item in items:
                artwork = item.get("album", {}).get("cover_xl") or item.get("album", {}).get("cover_big")
                tracks.append(Track(
                    id=f"deezer_{item['id']}",
                    title=item.get("title", "Unknown"),
                    artist=item.get("artist", {}).get("name", "Unknown"),
                    album=item.get("album", {}).get("title"),
                    duration_ms=item.get("duration", 0) * 1000,
                    thumbnail=artwork,
                    source="deezer",
                    metadata={"deezer_id": item.get("id")}
                ))
            return tracks
        except Exception as e:
            print(f"DeezerService Charts Error: {e}")
            return []

deezer_service = DeezerService()
