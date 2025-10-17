const normalizeEnv = (value?: string | null) => value?.trim() || undefined;

export const appConfig = {
  supabaseUrl: normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseTicketsBucket: normalizeEnv(process.env.SUPABASE_TICKETS_BUCKET) ?? 'tickets',
};
