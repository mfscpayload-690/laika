import { API_BASE_URL } from './api';
import { supabase } from './supabase';

export type EventAction = 'play' | 'complete' | 'skip';

export interface PlaybackEvent {
  track_id: string;
  title: string;
  artist: string;
  action: EventAction;
  thumbnail?: string;
  source?: string;
  user_id?: string;
  metadata?: Record<string, any>;
}

/**
 * Logs a playback event to the backend in a "fire and forget" manner.
 */
export async function logEvent(event: PlaybackEvent) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      ...event,
      user_id: user?.id || event.user_id, // Prefer auth user if available
    };

    // Fire and forget, don't await to keep UI snappy
    fetch(`${API_BASE_URL}/events/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => console.warn('[EventLogger] Failed to log event:', err));
  } catch (err) {
    console.warn('[EventLogger] Error:', err);
  }
}
