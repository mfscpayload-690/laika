import httpx
from typing import List, Optional
from core.schemas import Track

# Using a working JioSaavn API instance
SAAVN_SEARCH_URL = "https://jiosaavn-api-v3.vercel.app/search"

class SaavnService:
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
        Search for tracks on JioSaavn for high-quality Indian/Regional metadata.
        """
        client = self._get_client()
        params = {
            "query": query,
            # This API doesn't seem to support a simple 'limit' in search
            # but we can slice the results.
        }

        try:
            response = await client.get(SAAVN_SEARCH_URL, params=params)
            if response.status_code != 200:
                return []

            data = response.json()
            items = data.get("results", []) if isinstance(data, dict) else []
            
            tracks = []
            for item in items[:limit]:
                # Images are in a dict
                images = item.get("images", {})
                artwork = images.get("500x500") or item.get("image")
                
                more_info = item.get("more_info", {})
                artist_name = more_info.get("singers") or "Unknown Artist"

                tracks.append(Track(
                    id=f"saavn_{item['id']}",
                    title=item.get("title", "Unknown"),
                    artist=artist_name,
                    album=item.get("album"),
                    duration_ms=0, # This API doesn't seem to return duration in search results
                    thumbnail=artwork,
                    source="saavn",
                    metadata={
                        "saavn_id": item.get("id"),
                        "language": more_info.get("language"),
                        "album_id": more_info.get("album_id"),
                    }
                ))
            return tracks
        except Exception as e:
            print(f"SaavnService Error: {e}")
            return []

saavn_service = SaavnService()
