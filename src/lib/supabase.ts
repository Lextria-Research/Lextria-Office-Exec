// src/lib/supabase.ts
// Supabase client configured with the mandatory x-lextria-app: OFFICE header.
// Provides isolated schema accessors for 'office' and 'core'.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  'https://eafciegebhuhoneypsqy.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  'mock-anon-key-for-local-dev';

export const DATA_MODE =
  import.meta.env.VITE_DATA_MODE ||
  import.meta.env.DATA_MODE ||
  'supabase';

export const isSupabaseConfigured = Boolean(
  supabaseAnonKey && supabaseAnonKey !== 'mock-anon-key-for-local-dev'
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'x-lextria-app': 'OFFICE',
    },
  },
});

export const officeDb = supabase.schema('office');
export const coreDb = supabase.schema('core');
