import {NativeModules, PermissionsAndroid, Platform} from 'react-native';
import RNFS from 'react-native-fs';

import type {LocalSong} from '../types/music';

const AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.wav', '.flac', '.ogg']);

function hasAudioExtension(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return Array.from(AUDIO_EXTENSIONS).some(ext => lowerPath.endsWith(ext));
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
    duration: typeof value.duration === 'number' ? value.duration : 0,
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

  return deduplicateSongs(normalized).sort((a, b) => a.title.localeCompare(b.title));
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
        } else if (entry.isFile()) {
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

export async function scanDeviceForAudio(): Promise<LocalSong[]> {
  const hasPermission = await requestAndroidAudioPermission();
  if (!hasPermission) {
    throw new Error('Audio permission denied');
  }

  try {
    const fastNativeScan = await scanWithNativeAndroidModule();
    if (fastNativeScan.length > 0) {
      return deduplicateSongs(fastNativeScan);
    }
  } catch {
    // Continue with filesystem fallback for stability.
  }

  const roots = Platform.select({
    android: [RNFS.ExternalStorageDirectoryPath], // Avoid DownloadDirectoryPath as it's a child of ExternalStorage
    ios: [RNFS.DocumentDirectoryPath],
    default: [RNFS.DocumentDirectoryPath],
  });

  const allFiles = await Promise.all((roots ?? []).map(path => walkDirectory(path)));

  const scannedSongs = allFiles
    .flat()
    .filter(item => hasAudioExtension(item.path))
    .map(item => {
      const metadata = parseFileName(item.name);

      return {
        id: item.path,
        title: metadata.title,
        artist: metadata.artist,
        duration: 0,
        path: item.path,
      };
    });

  return deduplicateSongs(scannedSongs).sort((a, b) => a.title.localeCompare(b.title));
}
