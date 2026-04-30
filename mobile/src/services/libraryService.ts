import { supabase } from './supabase';
import type { LocalSong, RemoteTrack } from '../types/music';

export type LikedTrack = {
  id: string;
  user_id: string;
  track_id: string;
  track_metadata: TrackMetadata;
  created_at: string;
};

export type TrackMetadata = {
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  duration?: number;
  source: 'local' | 'remote';
};

export type Playlist = {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  is_public: boolean;
  thumbnail_url?: string;
  created_at: string;
};

export type PlaylistTrack = {
  id: string;
  playlist_id: string;
  track_id: string;
  track_metadata: TrackMetadata;
  position: number;
  created_at: string;
};

export type UserProfile = {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  email?: string;
};

// ─── LIKES ────────────────────────────────────────────────────────────────────

export async function getLikes(): Promise<LikedTrack[]> {
  const { data, error } = await supabase
    .from('likes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function isLiked(trackId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('likes')
    .select('id')
    .eq('track_id', trackId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

export async function likeTrack(track: LocalSong | RemoteTrack): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const isLocal = 'path' in track;
  const metadata: TrackMetadata = {
    title: track.title,
    artist: track.artist,
    album: track.album,
    artwork: isLocal ? (track as LocalSong).artwork : (track as RemoteTrack).thumbnail,
    duration: isLocal ? (track as LocalSong).duration : (track as RemoteTrack).duration_ms,
    source: isLocal ? 'local' : 'remote',
  };

  const { error } = await supabase.from('likes').insert({
    user_id: user.id,
    track_id: track.id,
    track_metadata: metadata,
  });
  if (error) throw error;
}

export async function unlikeTrack(trackId: string): Promise<void> {
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('track_id', trackId);
  if (error) throw error;
}

// ─── PLAYLISTS ────────────────────────────────────────────────────────────────

export async function getPlaylists(): Promise<Playlist[]> {
  const { data, error } = await supabase
    .from('playlists')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createPlaylist(name: string, description?: string): Promise<Playlist> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('playlists')
    .insert({ user_id: user.id, name, description })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const { error } = await supabase.from('playlists').delete().eq('id', playlistId);
  if (error) throw error;
}

export async function getPlaylistTracks(playlistId: string): Promise<PlaylistTrack[]> {
  const { data, error } = await supabase
    .from('playlist_tracks')
    .select('*')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addTrackToPlaylist(
  playlistId: string,
  track: LocalSong | RemoteTrack,
  position: number = 0,
): Promise<void> {
  const isLocal = 'path' in track;
  const metadata: TrackMetadata = {
    title: track.title,
    artist: track.artist,
    album: track.album,
    artwork: isLocal ? (track as LocalSong).artwork : (track as RemoteTrack).thumbnail,
    duration: isLocal ? (track as LocalSong).duration : (track as RemoteTrack).duration_ms,
    source: isLocal ? 'local' : 'remote',
  };

  const { error } = await supabase.from('playlist_tracks').insert({
    playlist_id: playlistId,
    track_id: track.id,
    track_metadata: metadata,
    position,
  });
  if (error) throw error;
}

export async function removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<void> {
  const { error } = await supabase
    .from('playlist_tracks')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('track_id', trackId);
  if (error) throw error;
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<UserProfile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(updates: Partial<UserProfile>): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error) throw error;
}
