import re
import asyncio
import json
from typing import List, Optional, Tuple
import httpx
from fastapi import HTTPException, status
from core.schemas import Track

class YoutubeService:
    def __init__(self):
        # Using a public Piped instance
        self.base_url = "https://pipedapi.kavin.rocks"
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=10.0)
        return self._client

    async def search_tracks(self, query: str, limit: int = 20) -> List[Track]:
        """
        Primary search method: Returns a list of Track objects from YouTube.
        """
        client = self._get_client()
        params = {
            "q": query,
            "filter": "music_videos"
        }

        try:
            response = await client.get(
                f"{self.base_url}/search",
                params=params
            )
            
            if response.status_code != 200:
                return []

            data = response.json()
            items = data.get("items", [])
            
            tracks = []
            for item in items[:limit]:
                if item.get("type") != "stream":
                    continue
                
                raw_title = item.get("title", "Unknown Title")
                artist, title = self._parse_title(raw_title, item.get("uploaderName", "Unknown Artist"))
                
                tracks.append(Track(
                    id=item.get("url", "").split("=")[-1] if "=" in item.get("url", "") else "unknown",
                    title=title,
                    artist=artist,
                    duration_ms=item.get("duration", 0) * 1000,
                    thumbnail=item.get("thumbnail", ""),
                    source="youtube",
                    youtube_id=item.get("url", "").split("=")[-1] if "=" in item.get("url", "") else None,
                    youtube_url=f"https://www.youtube.com/watch?v={item.get('url', '').split('=')[-1]}" if "=" in item.get("url", "") else None
                ))
            
            return tracks

        except Exception as e:
            print(f"DEBUG: YouTube search error: {e}")
            return []

    async def search_youtube(self, track: Track) -> List[dict]:
        """
        Candidate search for resolver: Returns raw dicts for matching engine.
        """
        query = f"{track.title} {track.artist}"
        client = self._get_client()
        params = {
            "q": query,
            "filter": "music_videos"
        }

        try:
            response = await client.get(
                f"{self.base_url}/search",
                params=params
            )
            
            if response.status_code != 200:
                return []

            data = response.json()
            items = data.get("items", [])
            
            candidates = []
            for item in items:
                if item.get("type") != "stream":
                    continue
                
                candidates.append({
                    "id": item.get("url", "").split("=")[-1] if "=" in item.get("url", "") else "",
                    "title": item.get("title", ""),
                    "duration_ms": item.get("duration", 0) * 1000,
                    "url": f"https://www.youtube.com/watch?v={item.get('url', '').split('=')[-1]}" if "=" in item.get("url", "") else "",
                    "uploader": item.get("uploaderName", ""),
                    "thumbnail": item.get("thumbnail", "")
                })
            
            return candidates

        except Exception:
            return []

    def _parse_title(self, raw_title: str, uploader: str) -> Tuple[str, str]:
        """
        Attempts to extract Artist and Title from a YouTube video title.
        """
        # Clean title from common suffixes
        clean_title = re.sub(r'\(.*?\)|\[.*?\]', '', raw_title).strip()
        clean_title = re.sub(r'(?i)official (video|audio|music video|lyric video)', '', clean_title).strip()

        # Split patterns: "Artist - Title", "Artist | Title", "Title by Artist"
        delimiters = [r'\s-\s', r'\s\|\s', r'\sby\s']
        
        for delim in delimiters:
            parts = re.split(delim, clean_title, maxsplit=1, flags=re.IGNORECASE)
            if len(parts) == 2:
                # If "Title by Artist", swap
                if "by" in delim:
                    return parts[1].strip(), parts[0].strip()
                return parts[0].strip(), parts[1].strip()

        # Fallback: Use uploader as artist if title doesn't have a clear split
        return uploader.strip(), clean_title

    async def extract_audio_url(self, video_url: str) -> dict:
        """
        Uses yt-dlp to extract the direct audio URL for a given YouTube video.
        """
        command = [
            "yt-dlp",
            "-j",
            "--no-playlist",
            "-f", "bestaudio",
            video_url
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )

            try:
                stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=10.0)
            except asyncio.TimeoutError:
                process.kill()
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail="Audio extraction timed out"
                )

            if process.returncode != 0:
                print(f"DEBUG: yt-dlp error: {stderr.decode()}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to extract audio URL"
                )

            data = json.loads(stdout.decode())
            
            return {
                "url": data.get("url"),
                "title": data.get("title"),
                "duration": data.get("duration", 0) * 1000
            }

        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            print(f"DEBUG: Extraction failure: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal error during audio extraction"
            )

    async def close(self):
        if self._client:
            await self._client.aclose()

# Singleton instance
youtube_service = YoutubeService()
