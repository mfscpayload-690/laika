export type LocalSong = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  duration: number;
  addedAt?: number;
  modifiedAt?: number;
  path: string;
};

/** Track returned by GET /search */
export type RemoteTrack = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration_ms: number;
  thumbnail?: string;
  youtube_id?: string;
  source: string;
  metadata?: any;
};

/** Response from POST /resolve */
export type ResolveResponse = {
  url: string;
  title: string;
  duration: number;
};
