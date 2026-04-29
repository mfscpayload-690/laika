import RNFS from 'react-native-fs';

import type {LocalSong} from '../types/music';

const CACHE_FILE_PATH = `${RNFS.DocumentDirectoryPath}/laika-library-cache.json`;

function isValidSong(value: unknown): value is LocalSong {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.artist === 'string' &&
    typeof candidate.path === 'string' &&
    typeof candidate.duration === 'number' &&
    (candidate.addedAt === undefined || typeof candidate.addedAt === 'number') &&
    (candidate.modifiedAt === undefined || typeof candidate.modifiedAt === 'number')
  );
}

function normalizeCachedDurations(songs: LocalSong[]): LocalSong[] {
  const positiveDurations = songs
    .map(song => song.duration)
    .filter(duration => duration > 0);

  if (positiveDurations.length === 0) {
    return songs;
  }

  const looksLikeSeconds = positiveDurations.every(duration => duration < 1000);
  if (!looksLikeSeconds) {
    return songs;
  }

  return songs.map(song => ({
    ...song,
    duration: song.duration > 0 ? song.duration * 1000 : 0,
  }));
}

function sortSongsByNewestTimestamp(songs: LocalSong[]): LocalSong[] {
  return [...songs].sort(
    (a, b) => (b.addedAt ?? b.modifiedAt ?? 0) - (a.addedAt ?? a.modifiedAt ?? 0),
  );
}

export async function loadCachedSongs(): Promise<LocalSong[]> {
  try {
    const exists = await RNFS.exists(CACHE_FILE_PATH);
    if (!exists) {
      return [];
    }

    const raw = await RNFS.readFile(CACHE_FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortSongsByNewestTimestamp(normalizeCachedDurations(parsed.filter(isValidSong)));
  } catch {
    return [];
  }
}

export async function saveCachedSongs(songs: LocalSong[]): Promise<void> {
  try {
    await RNFS.writeFile(CACHE_FILE_PATH, JSON.stringify(songs), 'utf8');
  } catch {
    // Ignore cache write failures to avoid interrupting playback flow.
  }
}

export async function saveCachedSongsChunk(songs: LocalSong[]): Promise<void> {
  await saveCachedSongs(songs);
}
