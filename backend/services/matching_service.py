import re
from typing import List, Optional
from core.schemas import Track

class MatchingService:
    def __init__(self):
        self.penalized_keywords = ["live", "remix", "cover", "slowed", "intro", "reaction", "teaser", "trailer", "short", "reverb"]
        self.boost_keywords = ["official", "audio", "lyrical", "full song", "high quality"]
        self.weights = {
            "title": 0.45,
            "artist": 0.35,
            "duration": 0.20
        }

    def select_best_candidate(self, track: Track, candidates: List[dict]) -> Optional[dict]:
        if not candidates:
            return None

        scored_candidates = []
        for candidate in candidates:
            score = self.calculate_score(track, candidate)
            scored_candidates.append({**candidate, "match_score": score})

        # Sort by score descending
        scored_candidates.sort(key=lambda x: x["match_score"], reverse=True)
        
        # Return best if score is above a reasonable threshold
        best = scored_candidates[0]
        if best["match_score"] > 0.4:
            return best
            
        return None

    def calculate_score(self, track: Track, candidate: dict) -> float:
        """
        Calculate a total score (0.0 to 1.0) for a candidate.
        """
        title_score = self._score_title(track.title, candidate.get("title", ""))
        artist_score = self._score_artist(track.artist, candidate.get("title", ""), candidate.get("uploader", ""))
        duration_score = self._score_duration(track.duration_ms, candidate.get("duration_ms", 0))
        
        # Apply penalties for unwanted keywords if they aren't in the original track title
        penalty = self._calculate_penalty(track.title, candidate.get("title", ""))
        boost = self._calculate_boost(candidate.get("title", ""))
        
        total_score = (
            (title_score * self.weights["title"]) +
            (artist_score * self.weights["artist"]) +
            (duration_score * self.weights["duration"])
        )
        
        return max(0.0, total_score - penalty + boost)

    def _calculate_boost(self, candidate_title: str) -> float:
        candidate_title = candidate_title.lower()
        boost = 0.0
        for word in self.boost_keywords:
            if word in candidate_title:
                boost += 0.05
        return min(0.15, boost)

    def _score_title(self, target: str, candidate: str) -> float:
        target = target.lower()
        candidate = candidate.lower()
        
        if target in candidate:
            return 1.0
            
        # Basic token overlap
        target_tokens = set(re.findall(r'\w+', target))
        candidate_tokens = set(re.findall(r'\w+', candidate))
        
        if not target_tokens:
            return 0.0
            
        overlap = target_tokens.intersection(candidate_tokens)
        return len(overlap) / len(target_tokens)

    def _score_artist(self, artist: str, title: str, uploader: str) -> float:
        artist = artist.lower()
        title = title.lower()
        uploader = uploader.lower()
        
        # Is artist in the video title or uploader name?
        if artist in title or artist in uploader:
            return 1.0
            
        # Split artist if multiple (e.g., "Artist A & Artist B")
        artist_parts = re.split(r'[&,x]', artist)
        matches = 0
        for part in artist_parts:
            if part.strip() in title or part.strip() in uploader:
                matches += 1
                
        return min(1.0, matches / len(artist_parts)) if artist_parts else 0.0

    def _score_duration(self, target_ms: int, candidate_ms: int) -> float:
        if target_ms <= 0:
            return 0.0
            
        diff = abs(target_ms - candidate_ms)
        # 30 seconds difference is a significant penalty
        penalty_limit = 30000 
        
        score = 1.0 - (diff / penalty_limit)
        return max(0.0, min(1.0, score))

    def _calculate_penalty(self, track_title: str, candidate_title: str) -> float:
        track_title = track_title.lower()
        candidate_title = candidate_title.lower()
        
        penalty = 0.0
        for word in self.penalized_keywords:
            # If the candidate has a penalty word but the source track doesn't
            if word in candidate_title and word not in track_title:
                penalty += 0.2
                
        return penalty

# Singleton instance
matching_service = MatchingService()
