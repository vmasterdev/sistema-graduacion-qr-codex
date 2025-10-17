import { CeremoniaCsvRow } from '@/types/ceremonia-import';
import { appConfig } from './config';
import { getSupabaseBrowserClient } from './supabase-client';

interface ImportCeremoniasParams {
  registros: CeremoniaCsvRow[];
  usuario: string;
  contrasena: string;
}

interface ImportCeremoniasResult {
  total: number;
}

const parseFechaCeremonia = (valor: string) => {
  const entrada = valor.trim();
  if (!entrada) {
    throw new Error('La fecha de la ceremonia es obligatoria.');
  }

  const parsed = new Date(entrada);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Fecha de ceremonia inválida: "${valor}"`);
  }

  return parsed.toISOString();
};

const normalizarRegistroSupabase = (registro: CeremoniaCsvRow) => {
  const externalId = registro.id_ceremonia?.trim();
  if (!externalId) {
    throw new Error('Cada ceremonia debe incluir un id_ceremonia.');
  }

  const name = registro.nombre_ceremonia?.trim();
  if (!name) {
    throw new Error(`Ceremonia "${externalId}" sin nombre.`);
  }

  const venue = registro.lugar_ceremonia?.trim();
  if (!venue) {
    throw new Error(`Ceremonia "${externalId}" sin lugar.`);
  }

  return {
    external_id: externalId,
    name,
    venue,
    scheduled_at: parseFechaCeremonia(registro.fecha_ceremonia),
    description: registro.descripcion?.trim() || null,
  };
};

const autenticarSupabase = async (usuario: string, contrasena: string) => {
  const supabase = getSupabaseBrowserClient();

  const email = usuario.trim();
  const password = contrasena;
  if (!email || !password) {
    throw new Error('Debes ingresar un usuario (email) y contraseña para autenticarte.');
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (!sessionError && sessionData?.session?.user?.email?.toLowerCase() === email.toLowerCase()) {
    return supabase;
  }

  if (sessionData?.session) {
    await supabase.auth.signOut();
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.name === 'AuthRetryableFetchError') {
      throw new Error(
        'No fue posible conectar con Supabase. Verifica NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY y tu conexión a internet.',
      );
    }
    throw new Error(error.message || 'Credenciales inválidas.');
  }

  return supabase;
};

const importarConSupabase = async ({ registros, usuario, contrasena }: ImportCeremoniasParams) => {
  const supabase = await autenticarSupabase(usuario, contrasena);
  const payload = registros.map(normalizarRegistroSupabase);

  const { data, error } = await supabase
    .from('ceremonies')
    .upsert(payload, { onConflict: 'external_id' })
    .select('external_id');

  if (error) {
    throw new Error(error.message || 'No fue posible importar las ceremonias en Supabase.');
  }

  return { total: data?.length ?? registros.length };
};

export const importarCeremoniasProtegidas = async (params: ImportCeremoniasParams): Promise<ImportCeremoniasResult> => {
  if (!appConfig.supabaseUrl || !appConfig.supabaseAnonKey) {
    const detalles: string[] = [];

    if (!appConfig.supabaseUrl) {
      detalles.push(
        appConfig.supabaseUrlRaw
          ? 'La URL configurada no es válida. Usa el dominio público completo de tu proyecto, por ejemplo: https://<tu-proyecto>.supabase.co.'
          : 'Falta definir NEXT_PUBLIC_SUPABASE_URL.',
      );
    }

    if (!appConfig.supabaseAnonKey) {
      detalles.push('Falta definir NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }

    const mensajeBase =
      'Configura NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY para importar ceremonias.';

    throw new Error(detalles.length ? `${mensajeBase} ${detalles.join(' ')}` : mensajeBase);
  }

  return importarConSupabase(params);
};
