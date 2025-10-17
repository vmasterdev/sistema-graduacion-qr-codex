const normalizeEnv = (value?: string | null) => value?.trim() || undefined;

const sanitizeSupabaseUrl = (value?: string) => {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = new URL(value);
    if (!/^https?:$/i.test(parsed.protocol)) {
      return undefined;
    }
    return parsed.origin;
  } catch {
    return undefined;
  }
};

const supabaseUrlRaw = normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);

export const appConfig = {
  supabaseUrl: sanitizeSupabaseUrl(supabaseUrlRaw),
  supabaseUrlRaw,
  supabaseAnonKey: normalizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseTicketsBucket: normalizeEnv(process.env.SUPABASE_TICKETS_BUCKET) ?? 'tickets',
};
