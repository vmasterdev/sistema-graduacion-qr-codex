import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { appConfig } from './config';

let browserClient: SupabaseClient | null = null;
let serviceClient: SupabaseClient | null = null;

export const getSupabaseBrowserClient = () => {
  if (!appConfig.supabaseUrl || !appConfig.supabaseAnonKey) {
    throw new Error('Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY antes de usar Supabase.');
  }

  if (!browserClient) {
    browserClient = createClient(appConfig.supabaseUrl, appConfig.supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'sistema-graduacion-supabase-auth',
      },
    });
  }

  return browserClient;
};

export const getSupabaseServiceClient = () => {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Configura SUPABASE_SERVICE_ROLE_KEY para operaciones del lado del servidor.');
  }

  if (!appConfig.supabaseUrl) {
    throw new Error('Configura NEXT_PUBLIC_SUPABASE_URL para usar Supabase.');
  }

  if (!serviceClient) {
    serviceClient = createClient(appConfig.supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
      },
    });
  }

  return serviceClient;
};
