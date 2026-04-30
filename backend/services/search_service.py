import asyncio
from typing import List
from core.schemas import Track
from services.youtube_service import YoutubeService
from services.deezer_service import DeezerService
from services.saavn_service import SaavnService

class MetaSearchService:
    def __init__(self):
        self.youtube = YoutubeService()
        self.deezer = DeezerService()
        self.saavn = SaavnService()

    async def search_tracks(self, query: str, limit: int = 20) -> List[Track]:
        """
        Orchestrates search across multiple sources:
        1. JioSaavn (Indian/Regional Focus)
        2. Deezer (International/Global Focus)
        3. YouTube (Fallback)
        """
        
        results = await asyncio.gather(
            self.saavn.search_tracks(query, limit=limit),
            self.deezer.search_tracks(query, limit=limit),
            self.youtube.search_tracks(query, limit=limit),
            return_exceptions=True
        )

        saavn_tracks = results[0] if isinstance(results[0], list) else []
        deezer_tracks = results[1] if isinstance(results[1], list) else []
        youtube_tracks = results[2] if isinstance(results[2], list) else []

        # Merge strategy:
        # 1. Start with Saavn and Deezer (High Quality Metadata)
        # 2. Deduplicate based on Title + Artist
        # 3. Fill up with YouTube results if we don't have enough
        
        merged_tracks = []
        seen_keys = set()

        def get_key(t: Track):
            # Simple deduplication key
            return f"{t.title.lower().strip()}|{t.artist.lower().strip()}"

        # Combine Saavn and Deezer first
        for track in saavn_tracks + deezer_tracks:
            key = get_key(track)
            if key not in seen_keys:
                merged_tracks.append(track)
                seen_keys.add(key)

        # Add YouTube tracks if they aren't already there
        # but only if we have few results or they seem unique
        for track in youtube_tracks:
            key = get_key(track)
            if key not in seen_keys:
                # Limit the number of YouTube results if we already have good metadata matches
                if len(merged_tracks) < limit:
                    merged_tracks.append(track)
                    seen_keys.add(key)

        return merged_tracks[:limit]

# Singleton instance
meta_search_service = MetaSearchService()
