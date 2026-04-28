import re
import asyncio
import json
from typing import List, Optional, Tuple
import httpx
from fastapi import HTTPException, status
from core.schemas import Track
from core.config import get_settings

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"


class YoutubeService:
    def __init__(self):
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=10.0)
        return self._client

    def _api_key(self) -> str:
        key = get_settings().youtube_api_key
        if not key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="YOUTUBE_API_KEY is not configured"
            )
        return key

    async def search_tracks(self, query: str, limit: int = 20) -> List[Track]:
        """
        Primary search: uses YouTube Data API v3 to return normalized Track objects.
        """
        client = self._get_client()
        api_key = self._api_key()

        # Step 1: search for video IDs
        search_params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "videoCategoryId": "10",  # Music category
            "maxResults": min(limit, 50),
            "key": api_key,
        }

        try:
            response = await client.get(YOUTUBE_SEARCH_URL, params=search_params)
            print(f"DEBUG: YouTube search status={response.status_code}")

            if response.status_code != 200:
                print(f"DEBUG: YouTube search error body: {response.text}")
                return []

            data = response.json()
            items = data.get("items", [])
            print(f"DEBUG: YouTube search returned {len(items)} items")

            if not items:
                return []

            # Step 2: fetch durations via videos endpoint
            video_ids = [item["id"]["videoId"] for item in items if item.get("id", {}).get("videoId")]
            durations = await self._fetch_durations(video_ids)

            tracks = []
            for item in items:
                video_id = item.get("id", {}).get("videoId")
                if not video_id:
                    continue

                snippet = item.get("snippet", {})
                raw_title = snippet.get("title", "Unknown Title")
                uploader = snippet.get("channelTitle", "Unknown Artist")
                artist, title = self._parse_title(raw_title, uploader)
                thumbnail = (
                    snippet.get("thumbnails", {}).get("high", {}).get("url")
                    or snippet.get("thumbnails", {}).get("default", {}).get("url", "")
                )

                tracks.append(Track(
                    id=video_id,
                    title=title,
                    artist=artist,
                    duration_ms=durations.get(video_id, 0),
                    thumbnail=thumbnail,
                    source="youtube",
                    youtube_id=video_id,
                    youtube_url=f"https://www.youtube.com/watch?v={video_id}",
                ))

            return tracks

        except HTTPException:
            raise
        except Exception as e:
            print(f"DEBUG: YouTube search exception: {e}")
            return []

    async def _fetch_durations(self, video_ids: List[str]) -> dict:
        """
        Fetches ISO 8601 durations for a list of video IDs and returns {id: ms}.
        """
        if not video_ids:
            return {}

        client = self._get_client()
        params = {
            "part": "contentDetails",
            "id": ",".join(video_ids),
            "key": self._api_key(),
        }

        try:
            response = await client.get(YOUTUBE_VIDEOS_URL, params=params)
            if response.status_code != 200:
                return {}

            data = response.json()
            result = {}
            for item in data.get("items", []):
                vid_id = item["id"]
                iso = item.get("contentDetails", {}).get("duration", "PT0S")
                result[vid_id] = self._iso8601_to_ms(iso)
            return result

        except Exception as e:
            print(f"DEBUG: Duration fetch error: {e}")
            return {}

    def _iso8601_to_ms(self, iso: str) -> int:
        """Converts ISO 8601 duration (e.g. PT3M45S) to milliseconds."""
        match = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', iso)
        if not match:
            return 0
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        seconds = int(match.group(3) or 0)
        return ((hours * 3600) + (minutes * 60) + seconds) * 1000

    async def search_youtube(self, track: Track) -> List[dict]:
        """
        Candidate search for resolver: returns raw dicts for the matching engine.
        """
        query = f"{track.artist} {track.title}"
        client = self._get_client()
        api_key = self._api_key()

        search_params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "videoCategoryId": "10",
            "maxResults": 10,
            "key": api_key,
        }

        try:
            response = await client.get(YOUTUBE_SEARCH_URL, params=search_params)
            if response.status_code != 200:
                print(f"DEBUG: Resolve search error: {response.text}")
                return []

            data = response.json()
            items = data.get("items", [])

            video_ids = [item["id"]["videoId"] for item in items if item.get("id", {}).get("videoId")]
            durations = await self._fetch_durations(video_ids)

            candidates = []
            for item in items:
                video_id = item.get("id", {}).get("videoId")
                if not video_id:
                    continue
                snippet = item.get("snippet", {})
                candidates.append({
                    "id": video_id,
                    "title": snippet.get("title", ""),
                    "duration_ms": durations.get(video_id, 0),
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "uploader": snippet.get("channelTitle", ""),
                    "thumbnail": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                })

            return candidates

        except HTTPException:
            raise
        except Exception as e:
            print(f"DEBUG: Resolve search exception: {e}")
            return []

    def _parse_title(self, raw_title: str, uploader: str) -> Tuple[str, str]:
        """Extracts (artist, title) from a YouTube video title."""
        clean = re.sub(r'\(.*?\)|\[.*?\]', '', raw_title).strip()
        clean = re.sub(r'(?i)(official\s+)?(music\s+)?(video|audio|lyric\s+video)', '', clean).strip()

        for delim in [r'\s-\s', r'\s\|\s', r'\sby\s']:
            parts = re.split(delim, clean, maxsplit=1, flags=re.IGNORECASE)
            if len(parts) == 2:
                if 'by' in delim:
                    return parts[1].strip(), parts[0].strip()
                return parts[0].strip(), parts[1].strip()

        return uploader.strip(), clean

    async def extract_audio_url(self, video_url: str) -> dict:
        """
        Uses yt-dlp to extract the direct audio stream URL.
        Tries multiple format selectors and retries once on 429.
        """
        # Format fallback chain: audio-only → best available → any
        format_attempts = ["bestaudio/best", "best", "worstaudio/worst"]

        last_stderr = ""

        for fmt in format_attempts:
            command = [
                "yt-dlp",
                "-j",
                "--no-playlist",
                "--remote-components", "ejs:github",
                "--no-warnings",
                "-f", fmt,
                video_url,
            ]

            for attempt in range(2):  # retry once on 429
                if attempt > 0:
                    print(f"DEBUG: yt-dlp retrying after 429, attempt {attempt + 1}")
                    await asyncio.sleep(3)

                try:
                    process = await asyncio.create_subprocess_exec(
                        *command,
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE
                    )

                    try:
                        stdout, stderr = await asyncio.wait_for(
                            process.communicate(), timeout=45.0
                        )
                    except asyncio.TimeoutError:
                        process.kill()
                        raise HTTPException(
                            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                            detail="Audio extraction timed out"
                        )

                    last_stderr = stderr.decode()

                    if process.returncode == 0:
                        data = json.loads(stdout.decode())
                        audio_url = data.get("url")
                        if audio_url:
                            print(f"DEBUG: yt-dlp success with format={fmt}")
                            return {
                                "url": audio_url,
                                "title": data.get("title"),
                                "duration": data.get("duration", 0) * 1000,
                            }

                    # 429 → retry same format after sleep
                    if "429" in last_stderr:
                        continue

                    # Any other error → try next format
                    print(f"DEBUG: yt-dlp failed format={fmt}: {last_stderr[:200]}")
                    break

                except HTTPException:
                    raise
                except Exception as e:
                    print(f"DEBUG: yt-dlp exception: {e}")
                    break

        print(f"DEBUG: yt-dlp all formats exhausted. Last error: {last_stderr[:300]}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not extract audio. YouTube may be rate-limiting — try again in a moment."
        )

    async def close(self):
        if self._client:
            await self._client.aclose()


# Singleton instance
youtube_service = YoutubeService()
