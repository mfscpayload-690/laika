import RNFS from 'react-native-fs';

const CACHE_DIR = `${RNFS.CachesDirectoryPath}/tracks`;

export const ensureCacheDir = async () => {
  const exists = await RNFS.exists(CACHE_DIR);
  if (!exists) {
    await RNFS.mkdir(CACHE_DIR);
  }
};

export const getCachedTrackPath = (trackId: string) => {
  // Clean trackId for filename usage
  const safeId = trackId.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${CACHE_DIR}/${safeId}.mp3`;
};

export const isTrackCached = async (trackId: string) => {
  const path = getCachedTrackPath(trackId);
  return await RNFS.exists(path);
};

export const cacheTrack = async (trackId: string, url: string) => {
  await ensureCacheDir();
  const path = getCachedTrackPath(trackId);
  
  try {
    const download = RNFS.downloadFile({
      fromUrl: url,
      toFile: path,
      background: true,
      discretionary: true,
    });
    
    return await download.promise;
  } catch (error) {
    console.warn('[CacheService] Failed to cache track:', trackId, error);
    // Cleanup partial file if it exists
    if (await RNFS.exists(path)) {
      await RNFS.unlink(path);
    }
    throw error;
  }
};

export const clearCache = async () => {
  const exists = await RNFS.exists(CACHE_DIR);
  if (exists) {
    await RNFS.unlink(CACHE_DIR);
    await RNFS.mkdir(CACHE_DIR);
  }
};
