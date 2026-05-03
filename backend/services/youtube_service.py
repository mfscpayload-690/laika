import re
import asyncio
import json
import os
import time
from typing import List, Optional, Tuple
import httpx
from fastapi import HTTPException
from core.schemas import Track
from core.config import get_settings
from ytmusicapi import YTMusic
from utils.piped_resolver import piped_resolver

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"

# Path for persistent cache
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE_DIR = os.path.join(BASE_DIR, "local")
CACHE_FILE = os.path.join(CACHE_DIR, "cache", "youtube_cache.json")

class YoutubeService:
    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None
        self._resolution_cache = {}  # {metadata_key: video_url}
        self._stream_cache = {}      # {video_url: {"url": str, "expiry": float}}
        self._ytm = YTMusic()
        
        # Ensure the cache directory exists
        cache_dir = os.path.dirname(CACHE_FILE)
        if not os.path.exists(cache_dir):
            os.makedirs(cache_dir, exist_ok=True)
            
        self._extract_semaphore = asyncio.Semaphore(5)
        self._load_cache()

    def _load_cache(self):
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, "r") as f:
                    data = json.load(f)
                    self._resolution_cache = data.get("resolution", {})
                    # Load and clean stream cache
                    now = time.time()
                    loaded_streams = data.get("stream", {})
                    self._stream_cache = {
                        k: v for k, v in loaded_streams.items()
                        if v.get("expiry", 0) > now
                    }
                print(f"Loaded cache: {len(self._resolution_cache)} resolutions, {len(self._stream_cache)} streams")
            except Exception as e:
                print(f"Failed to load cache: {e}")

    def _save_cache(self):
        try:
            with open(CACHE_FILE, "w") as f:
                json.dump({
                    "resolution": self._resolution_cache,
                    "stream": self._stream_cache
                }, f)
        except Exception as e:
            print(f"Failed to save cache: {e}")

    def _get_metadata_key(self, title: str, artist: str) -> str:
        return f"{title.lower()}|{artist.lower()}"

    def set_resolution(self, title: str, artist: str, video_url: str):
        key = self._get_metadata_key(title, artist)
        self._resolution_cache[key] = video_url
        self._save_cache()

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=30.0,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"}
            )
        return self._client

    def _api_key(self) -> str:
        return get_settings().youtube_api_key

    async def search_tracks(self, query: str, limit: int = 20) -> List[Track]:
        """Search for tracks using YouTube Music API (Pro-grade music metadata)."""
        print(f"Searching YouTube Music: {query}")
        try:
            # Run in thread pool as ytmusicapi is synchronous
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(None, lambda: self._ytm.search(query, filter="songs"))
            
            tracks = []
            for item in results[:limit]:
                v_id = item.get("videoId")
                if not v_id:
                    continue
                
                # Get best thumbnail
                thumbnails = item.get("thumbnails", [])
                thumb_url = thumbnails[-1]["url"] if thumbnails else f"https://i.ytimg.com/vi/{v_id}/hqdefault.jpg"
                
                # Parse artists
                artists = [a["name"] for a in item.get("artists", [])]
                artist_name = ", ".join(artists) if artists else "Unknown Artist"
                
                tracks.append(Track(
                    id=v_id,
                    title=item.get("title", "Unknown"),
                    artist=artist_name,
                    album=item.get("album", {}).get("name", ""),
                    duration_ms=int(item.get("duration_seconds", 0) * 1000),
                    thumbnail=thumb_url,
                    source="youtube",
                    youtube_id=v_id,
                    youtube_url=f"https://www.youtube.com/watch?v={v_id}"
                ))
            
            if tracks:
                return tracks
        except Exception as e:
            print(f"YouTube Music search failed: {e}")

        # 2. Fallback to Scraping
        return await self._scrape_search(query, limit)

    async def search_video(self, query: str) -> Optional[str]:
        """Convenience method to get a single video ID."""
        tracks = await self.search_tracks(query, limit=1)
        return tracks[0].id if tracks else None

    async def search_youtube(self, track: Track) -> List[dict]:
        """Resolution helper for the matching engine."""
        # Cache check
        key = self._get_metadata_key(track.title, track.artist)
        if key in self._resolution_cache:
            v_url = self._resolution_cache[key]
            return [{"id": v_url.split("v=")[-1], "title": track.title, "url": v_url, "duration_ms": track.duration_ms}]

        query = f"{track.artist} {track.title}"
        tracks = await self.search_tracks(query, limit=5)
        return [{
            "id": t.id, "title": t.title, "duration_ms": t.duration_ms,
            "url": t.youtube_url, "uploader": t.artist
        } for t in tracks]

    async def _scrape_search(self, query: str, limit: int) -> List[Track]:
        """Scrape search results using yt-dlp with mobile impersonation and optional cookies."""
        print(f"Scraping YouTube: {query}")
        try:
            cmd = [
                "python3", "-m", "yt_dlp",
                "--dump-json",
                "--flat-playlist",
                "--extractor-args", "youtube:player_client=android",
                f"ytsearch{limit}:{query}"
            ]
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, _ = await proc.communicate()
            tracks = []
            for line in stdout.decode().splitlines():
                try:
                    item = json.loads(line)
                    tracks.append(Track(
                        id=item["id"], title=item.get("title", "Unknown"),
                        artist=item.get("uploader", "Unknown"),
                        duration_ms=int(item.get("duration", 0) * 1000),
                        thumbnail=f"https://i.ytimg.com/vi/{item['id']}/hqdefault.jpg",
                        source="youtube", youtube_id=item["id"],
                        youtube_url=f"https://www.youtube.com/watch?v={item['id']}"
                    ))
                except Exception:
                    continue
            return tracks
        except Exception as e:
            print(f"Scraping failed: {e}")
            return []

    async def extract_audio_url(self, video_url: str) -> dict:
        """Extracts direct audio stream URL using Piped API (Primary) or yt-dlp (Fallback)."""
        now = time.time()
        if video_url in self._stream_cache:
            entry = self._stream_cache[video_url]
            if now < entry["expiry"]:
                return entry["data"]

        video_id = video_url.split("v=")[-1] if "v=" in video_url else video_url.split("/")[-1]

        async with self._extract_semaphore:
            # 1. Try Piped Resolver
            print(f"Resolving with Piped: {video_id}")
            piped_data = await piped_resolver.get_stream_url(video_id)
            
            if piped_data:
                res = {
                    "url": piped_data["url"],
                    "title": piped_data["title"],
                    "duration": piped_data["duration"]
                }
                # Caching
                self._stream_cache[video_url] = {"data": res, "expiry": now + 3600} # Piped URLs usually last 1-6 hours
                self._save_cache()
                return res

            # 2. Fallback to yt-dlp (Legacy)
            print(f"Piped failed, falling back to yt-dlp for {video_url}")
            settings = get_settings()
            po_token = getattr(settings, 'YOUTUBE_PO_TOKEN', None)
            visitor_data = getattr(settings, 'YOUTUBE_VISITOR_DATA', None)
            
            cmd = [
                "python3", "-m", "yt_dlp",
                "-j", "--no-playlist",
                "--extractor-args", "youtube:player_client=ios,web",
                "-f", "bestaudio/best",
                video_url
            ]
            if po_token and visitor_data:
                cmd.extend(["--extractor-args", f"youtube:po_token={po_token},visitor_data={visitor_data}"])

            proc = await asyncio.create_subprocess_exec(
                *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()
            
            if proc.returncode == 0:
                try:
                    data = json.loads(stdout.decode())
                    res = {
                        "url": data["url"],
                        "title": data.get("title", "Unknown"),
                        "duration": data.get("duration", 0) * 1000
                    }
                    self._stream_cache[video_url] = {"data": res, "expiry": now + 3600}
                    self._save_cache()
                    return res
                except Exception as e:
                    print(f"Error parsing yt-dlp output: {e}")
            else:
                print(f"yt-dlp failed with code {proc.returncode}: {stderr.decode()}")

            raise HTTPException(
                status_code=502, 
                detail="All extraction methods failed (Piped & yt-dlp). YouTube might be blocking requests."
            )

    async def _fetch_durations(self, video_ids: List[str]) -> dict:
        if not video_ids:
            return {}
        try:
            params = {"part": "contentDetails", "id": ",".join(video_ids), "key": self._api_key()}
            async with self._get_client() as client:
                response = await client.get(YOUTUBE_VIDEOS_URL, params=params)
                if response.status_code == 200:
                    data = response.json()
                    return {item["id"]: self._iso8601_to_ms(item["contentDetails"]["duration"]) 
                            for item in data.get("items", [])}
        except Exception:
            pass
        return {}

    def _iso8601_to_ms(self, iso: str) -> int:
        match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', iso)
        if not match:
            return 0
        h, m, s = [int(match.group(i) or 0) for i in range(1, 4)]
        return ((h * 3600) + (m * 60) + s) * 1000

    def _parse_title(self, raw_title: str, uploader: str) -> Tuple[str, str]:
        clean = re.sub(r'\(.*?\)|\[.*?\]', '', raw_title).strip()
        for delim in [r'\s-\s', r'\s\|\s', r'\sby\s']:
            parts = re.split(delim, clean, maxsplit=1, flags=re.IGNORECASE)
            if len(parts) == 2:
                return (parts[1].strip(), parts[0].strip()) if 'by' in delim else (parts[0].strip(), parts[1].strip())
        return uploader.strip(), clean

    async def close(self):
        await piped_resolver.close()
        if self._client:
            await self._client.aclose()

youtube_service = YoutubeService()
