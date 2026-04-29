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
    typeof candidate.duration === 'number'
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

    return parsed.filter(isValidSong);
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
