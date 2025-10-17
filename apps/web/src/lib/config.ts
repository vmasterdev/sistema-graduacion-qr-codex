﻿export const appConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseTicketsBucket: process.env.SUPABASE_TICKETS_BUCKET ?? 'tickets',
};
