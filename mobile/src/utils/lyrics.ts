/**
 * Represents a single line of lyrics with a timestamp.
 */
export interface LyricLine {
  time: number; // In milliseconds
  text: string;
}

/**
 * Parses raw LRC string into an array of LyricLine objects.
 * Format: [mm:ss.xx] Lyrics text
 */
export function parseLRC(lrc: string): LyricLine[] {
  if (!lrc) return [];

  const lines = lrc.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d+):(\d+)\.(\d+)\]/;

  lines.forEach(line => {
    const match = timeRegex.exec(line);
    if (match) {
      const mins = parseInt(match[1], 10);
      const secs = parseInt(match[2], 10);
      const ms = parseInt(match[3].padEnd(3, '0').slice(0, 3), 10);
      
      const totalMs = mins * 60000 + secs * 1000 + ms;
      const text = line.replace(timeRegex, '').trim();
      
      if (text || result.length > 0) { // Keep empty lines only if they aren't at the start
        result.push({ time: totalMs, text });
      }
    }
  });

  return result.sort((a, b) => a.time - b.time);
}

/**
 * Finds the index of the current active lyric line based on playback time.
 */
export function findActiveLine(lyrics: LyricLine[], currentTimeMs: number): number {
  if (!lyrics.length) return -1;
  
  let index = -1;
  for (let i = 0; i < lyrics.length; i++) {
    if (currentTimeMs >= lyrics[i].time) {
      index = i;
    } else {
      break;
    }
  }
  return index;
}
