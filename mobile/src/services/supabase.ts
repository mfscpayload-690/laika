import 'react-native-url-polyfill/auto';
// @ts-ignore
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Replace these with your actual Supabase project values!
// I'm using placeholders that follow the standard format.
const SUPABASE_URL = 'https://uexpoyhvzscxxmgijths.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVleHBveWh2enNjeHhtZ2lqdGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NTAyNDMsImV4cCI6MjA5MzAyNjI0M30.anoOHID1QN7P4skoMug3e5LI90jBPMr2vf1qL4k24d8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
