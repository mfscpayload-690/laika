import type { RemoteTrack, ResolveResponse } from '../types/music';

// ADB reverse is set up via: adb reverse tcp:8000 tcp:8000
// This tunnels the phone's localhost:8000 → your dev machine's port 8000 over USB.
// Works for physical devices without needing to know your LAN IP.
export const API_BASE_URL = 'http://127.0.0.1:8000';

// In-memory cache for resolved URLs to enable <300ms playback
const RESOLVE_CACHE: Record<string, { data: ResolveResponse; expiresAt: number }> = {};
const DEFAULT_TTL = 5 * 60 * 60 * 1000; // 5 hours (YouTube URLs usually last 6h)

function getCacheKey(title: string, artist: string): string {
  return `${title.toLowerCase()}|${artist.toLowerCase()}`;
}

export async function searchTracks(query: string, limit = 20): Promise<RemoteTrack[]> {
  const url = `${API_BASE_URL}/search/?q=${encodeURIComponent(query)}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }
  const data = await res.json();
  return (data.tracks ?? []) as RemoteTrack[];
}

export async function resolveTrack(
  title: string,
  artist: string,
  duration: number,
  forceRefresh = false,
): Promise<ResolveResponse> {
  const cacheKey = getCacheKey(title, artist);
  const cached = RESOLVE_CACHE[cacheKey];

  if (!forceRefresh && cached && Date.now() < cached.expiresAt) {
    console.log(`[Cache] Hit for: ${title}`);
    return cached.data;
  }

  const res = await fetch(`${API_BASE_URL}/resolve/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, artist, duration }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Resolve failed: ${res.status}`);
  }

  const data = (await res.json()) as ResolveResponse;
  
  // Store in cache
  RESOLVE_CACHE[cacheKey] = {
    data,
    expiresAt: Date.now() + DEFAULT_TTL,
  };

  return data;
}

/**
 * Background resolver to pre-fill the cache
 */
export async function prefetchTrack(track: RemoteTrack) {
  const cacheKey = getCacheKey(track.title, track.artist);
  if (RESOLVE_CACHE[cacheKey]) return;

  try {
    console.log(`[Prefetch] Resolving in background: ${track.title}`);
    await resolveTrack(track.title, track.artist, track.duration_ms);
  } catch (e) {
    console.warn(`[Prefetch] Failed for ${track.title}:`, e);
  }
}
