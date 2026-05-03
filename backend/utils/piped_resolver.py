import random
from typing import Optional, Dict, Any
import httpx
from core.config import get_settings

class StreamResolver:
    def __init__(self):
        settings = get_settings()
        self.piped_instances = settings.piped_instances
        self.invidious_instances = settings.invidious_instances
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
        Attempts to fetch audio stream information from multiple Piped and Invidious instances.
        Returns a dict with 'url', 'title', and 'duration' (ms) if successful.
        """
        # 1. Try Piped
        piped_res = await self._try_piped(video_id)
        if piped_res:
            return piped_res

        # 2. Try Invidious
        invidious_res = await self._try_invidious(video_id)
        if invidious_res:
            return invidious_res

        return None

    async def _try_piped(self, video_id: str) -> Optional[Dict[str, Any]]:
        shuffled_instances = list(self.piped_instances)
        random.shuffle(shuffled_instances)
        client = self._get_client()

        for instance in shuffled_instances:
            try:
                url = f"{instance}/streams/{video_id}"
                print(f"Trying Piped instance: {instance} for video: {video_id}")
                response = await client.get(url)
                if response.status_code != 200:
                    continue

                data = response.json()
                audio_streams = data.get("audioStreams", [])
                if not audio_streams:
                    hls_url = data.get("hls")
                    if hls_url:
                        return {
                            "url": hls_url,
                            "title": data.get("title", "Unknown"),
                            "duration": data.get("duration", 0) * 1000,
                            "format": "hls"
                        }
                    continue

                def get_bitrate(s):
                    q = s.get("quality", "0")
                    try:
                        return int(q.split()[0])
                    except Exception:
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

    async def _try_invidious(self, video_id: str) -> Optional[Dict[str, Any]]:
        shuffled_instances = list(self.invidious_instances)
        random.shuffle(shuffled_instances)
        client = self._get_client()

        for instance in shuffled_instances:
            try:
                url = f"{instance}/api/v1/videos/{video_id}"
                print(f"Trying Invidious instance: {instance} for video: {video_id}")
                response = await client.get(url)
                if response.status_code != 200:
                    continue

                data = response.json()
                # Invidious has adaptiveFormats
                adaptive = data.get("adaptiveFormats", [])
                # Filter for audio formats (usually contain 'audio/' type)
                audio_streams = [f for f in adaptive if "audio/" in f.get("type", "")]
                
                if not audio_streams:
                    continue

                # Sort by bitrate descending
                def get_bitrate(s):
                    return int(s.get("bitrate", 0))

                audio_streams.sort(key=get_bitrate, reverse=True)
                best_stream = audio_streams[0]
                
                return {
                    "url": best_stream["url"],
                    "title": data.get("title", "Unknown"),
                    "duration": data.get("lengthSeconds", 0) * 1000,
                    "format": "m4a" if "mp4" in best_stream.get("type", "") else "webm"
                }
            except Exception as e:
                print(f"Error fetching from Invidious instance {instance}: {e}")
                continue
        return None

    async def close(self):
        if self._client:
            await self._client.aclose()

stream_resolver = StreamResolver()

# Compatibility alias
piped_resolver = stream_resolver
