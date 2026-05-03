import asyncio
import random
from typing import Optional, List, Dict, Any
import httpx
from core.config import get_settings

class PipedResolver:
    def __init__(self):
        self.instances = get_settings().piped_instances
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=15.0,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
                },
                follow_redirects=True
            )
        return self._client

    async def get_stream_url(self, video_id: str) -> Optional[Dict[str, Any]]:
        """
        Attempts to fetch audio stream information from multiple Piped instances.
        Returns a dict with 'url', 'title', and 'duration' (ms) if successful.
        """
        # Shuffle instances to distribute load and increase success chance
        shuffled_instances = list(self.instances)
        random.shuffle(shuffled_instances)

        client = self._get_client()

        for instance in shuffled_instances:
            try:
                url = f"{instance}/streams/{video_id}"
                print(f"Trying Piped instance: {instance} for video: {video_id}")
                
                response = await client.get(url)
                if response.status_code != 200:
                    print(f"Piped instance {instance} failed with status {response.status_code}")
                    continue

                data = response.json()
                
                # We prefer high-quality M4A or Opus audio streams
                audio_streams = data.get("audioStreams", [])
                if not audio_streams:
                    # Try HLS as fallback if no direct audio streams
                    hls_url = data.get("hls")
                    if hls_url:
                        return {
                            "url": hls_url,
                            "title": data.get("title", "Unknown"),
                            "duration": data.get("duration", 0) * 1000,
                            "format": "hls"
                        }
                    continue

                # Sort by bitrate descending to get best quality
                # Piped quality is often like "128 kbps" - we can parse this or just pick the best one
                def get_bitrate(s):
                    q = s.get("quality", "0")
                    try:
                        return int(q.split()[0])
                    except:
                        return 0

                audio_streams.sort(key=get_bitrate, reverse=True)
                best_stream = audio_streams[0]

                return {
                    "url": best_stream["url"],
                    "title": data.get("title", "Unknown"),
                    "duration": data.get("duration", 0) * 1000,
                    "format": best_stream.get("format", "m4a")
                }

            except Exception as e:
                print(f"Error fetching from Piped instance {instance}: {e}")
                continue

        return None

    async def close(self):
        if self._client:
            await self._client.aclose()

piped_resolver = PipedResolver()
