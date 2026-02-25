import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { localSupabase } from './localDB';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const USE_LOCAL_DB = !supabaseUrl || !supabaseAnonKey;

if (USE_LOCAL_DB) {
  console.log(
    '⚡ Running with LOCAL mock database (no Supabase credentials found).\n' +
    '   Test accounts:\n' +
    '     admin@kgs.com   / admin123\n' +
    '     student@kgs.com / student123\n' +
    '     priya@kgs.com   / student123\n' +
    '     parent@kgs.com  / parent123'
  );
}

export const supabase: any = USE_LOCAL_DB
  ? localSupabase
  : createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      ...(Platform.OS !== 'web'
        ? {
          storage: undefined,
        }
        : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
