import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import RNFS from 'react-native-fs';

import type {LocalSong} from '../types/music';

const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.wav', '.flac', '.ogg']);
const EXCLUDED_PATH_PATTERNS = [
  '/whatsapp/',
  '/whatsapp audio/',
  '/whatsapp voice notes/',
  '/whatsapp voice messages/',
];

function hasAudioExtension(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return Array.from(AUDIO_EXTENSIONS).some(ext => lowerPath.endsWith(ext));
}

function isExcludedAudioPath(path: string): boolean {
  const normalizedPath = path.toLowerCase().replace(/\\/g, '/');
  return EXCLUDED_PATH_PATTERNS.some(pattern => normalizedPath.includes(pattern));
}

function parseFileName(fileName: string): {title: string; artist: string} {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, '');
  const [artist, title] = withoutExtension.split(' - ').map(part => part.trim());

  if (artist && title) {
    return {artist, title};
  }

  return {
    artist: 'Unknown Artist',
    title: withoutExtension || 'Unknown Title',
  };
}

function normalizeSong(value: Partial<LocalSong>): LocalSong | null {
  if (!value.path || !value.id) {
    return null;
  }

  return {
    id: value.id,
    title: value.title ?? 'Unknown Title',
    artist: value.artist ?? 'Unknown Artist',
    album: value.album,
    artwork: value.artwork,
    duration: typeof value.duration === 'number' ? value.duration : 0,
    addedAt: typeof value.addedAt === 'number' ? value.addedAt : undefined,
    modifiedAt: typeof value.modifiedAt === 'number' ? value.modifiedAt : undefined,
    path: value.path,
  };
}

function deduplicateSongs(songs: LocalSong[]): LocalSong[] {
  const seen = new Set<string>();
  return songs.filter(song => {
    if (seen.has(song.path)) {
      return false;
    }
    seen.add(song.path);
    return true;
  });
}

function sortByTitle(songs: LocalSong[]): LocalSong[] {
  return [...songs].sort((a, b) => a.title.localeCompare(b.title));
}

async function requestAndroidAudioPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  if (Platform.Version >= 33) {
    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
    );
    return status === PermissionsAndroid.RESULTS.GRANTED;
  }

  const status = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  );
  return status === PermissionsAndroid.RESULTS.GRANTED;
}

export async function ensureAudioPermission(): Promise<boolean> {
  return requestAndroidAudioPermission();
}

async function scanWithNativeAndroidModule(): Promise<LocalSong[]> {
  if (Platform.OS !== 'android') {
    return [];
  }

  const module = NativeModules.AudioScanner as
    | {scanAudioFiles?: () => Promise<Partial<LocalSong>[]>}
    | undefined;

  if (!module?.scanAudioFiles) {
    return [];
  }

  const rawSongs = await module.scanAudioFiles();
  if (!Array.isArray(rawSongs)) {
    return [];
  }

  const normalized = rawSongs
    .map(normalizeSong)
    .filter((song): song is LocalSong => song !== null);

  return sortByTitle(deduplicateSongs(normalized));
}

async function walkDirectory(rootPath: string): Promise<RNFS.ReadDirItem[]> {
  const files: RNFS.ReadDirItem[] = [];
  const queue: string[] = [rootPath];
  const workers = Array.from({length: 4}, () => 0);

  const processQueue = async () => {
    while (queue.length > 0) {
      const current = queue.pop();
      if (!current) {
        continue;
      }

      let entries: RNFS.ReadDirItem[] = [];
      try {
        entries = await RNFS.readDir(current);
      } catch {
        continue;
      }

      for (const entry of entries) {
        if (entry.isDirectory()) {
          queue.push(entry.path);
        } else if (entry.isFile() && !isExcludedAudioPath(entry.path)) {
          files.push(entry);
        }
      }

      // Yield frequently so UI remains responsive during large scans.
      await Promise.resolve();
    }
  };

  await Promise.all(workers.map(processQueue));

  return files;
}

export type ScanAudioOptions = {
  onChunk?: (songs: LocalSong[]) => void;
  chunkSize?: number;
  incrementalRefresh?: boolean;
};

export async function scanDeviceForAudio(options?: ScanAudioOptions): Promise<LocalSong[]> {
  const hasPermission = await requestAndroidAudioPermission();
  if (!hasPermission) {
    throw new Error('Audio permission denied');
  }

  try {
    const fastNativeScan = await scanWithNativeAndroidModule();
    if (fastNativeScan.length > 0) {
      const dedupedNative = deduplicateSongs(fastNativeScan);
      options?.onChunk?.(dedupedNative);
      return dedupedNative;
    }
  } catch {
    // Continue with filesystem fallback for stability.
  }

  const preferredAndroidRoots = [
    `${RNFS.ExternalStorageDirectoryPath}/Music`,
    RNFS.DownloadDirectoryPath,
  ];

  const roots = Platform.select({
    android: options?.incrementalRefresh === false
      ? [RNFS.ExternalStorageDirectoryPath]
      : [...preferredAndroidRoots, RNFS.ExternalStorageDirectoryPath],
    ios: [RNFS.DocumentDirectoryPath],
    default: [RNFS.DocumentDirectoryPath],
  });

  const allFiles = await Promise.all((roots ?? []).map(path => walkDirectory(path)));

  const chunkSize = options?.chunkSize ?? 120;
  const scannedSongs = allFiles
    .flat()
    .filter(item => hasAudioExtension(item.path) && !isExcludedAudioPath(item.path))
    .map(item => {
      const metadata = parseFileName(item.name);
      const modifiedAt = item.mtime ? item.mtime.getTime() : undefined;
      const addedAt = item.ctime ? item.ctime.getTime() : modifiedAt;

      return {
        id: item.path,
        title: metadata.title,
        artist: metadata.artist,
        duration: 0,
        addedAt,
        modifiedAt,
        path: item.path,
      };
    });

  if (options?.onChunk) {
    for (let offset = 0; offset < scannedSongs.length; offset += chunkSize) {
      const chunk = sortByTitle(deduplicateSongs(scannedSongs.slice(0, offset + chunkSize)));
      options.onChunk(chunk);
      await Promise.resolve();
    }
  }

  return sortByTitle(deduplicateSongs(scannedSongs));
}
