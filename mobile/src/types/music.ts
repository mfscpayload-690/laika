export type LocalSong = {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artwork?: string;
  duration: number;
  path: string;
};

/** Track returned by GET /search */
export type RemoteTrack = {
  id: string;
  title: string;
  artist: string;
  duration_ms: number;
  thumbnail?: string;
  youtube_id?: string;
};

/** Response from POST /resolve */
export type ResolveResponse = {
  url: string;
  title: string;
  duration: number;
};
