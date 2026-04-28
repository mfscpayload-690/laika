import type { RemoteTrack, ResolveResponse } from '../types/music';

// ADB reverse is set up via: adb reverse tcp:8000 tcp:8000
// This tunnels the phone's localhost:8000 → your dev machine's port 8000 over USB.
// Works for physical devices without needing to know your LAN IP.
export const API_BASE_URL = 'http://localhost:8000';

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
): Promise<ResolveResponse> {
  const res = await fetch(`${API_BASE_URL}/resolve/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, artist, duration }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.detail ?? `Resolve failed: ${res.status}`);
  }
  return res.json() as Promise<ResolveResponse>;
}
