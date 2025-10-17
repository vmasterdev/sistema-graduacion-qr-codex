import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { getSupabaseServiceClient } from '@/lib/supabase-client';

type CheckInRequestBody = {
  id?: string;
  inviteeId?: string;
  ceremonyId?: string;
  ticketCode?: string;
  scannedAt?: string;
  source?: 'scanner' | 'manual';
  operator?: string;
};

type CheckInResponse =
  | {
      ok: true;
      duplicate?: boolean;
      id: string;
    }
  | {
      error: string;
    };

type CheckInListResponse =
  | {
      ok: true;
      items: Array<{
        id: string;
        inviteeId: string;
        ceremonyId: string;
        ticketCode: string;
        scannedAt: string;
        source: 'scanner' | 'manual';
        operator?: string | null;
      }>;
    }
  | { error: string };

const validateBody = (body: CheckInRequestBody) => {
  const errors: string[] = [];

  if (!body?.inviteeId) {
    errors.push('inviteeId es requerido.');
  }
  if (!body?.ceremonyId) {
    errors.push('ceremonyId es requerido.');
  }
  if (!body?.ticketCode) {
    errors.push('ticketCode es requerido.');
  }
  if (!body?.scannedAt) {
    errors.push('scannedAt es requerido.');
  } else if (Number.isNaN(new Date(body.scannedAt).getTime())) {
    errors.push('scannedAt debe ser una fecha válida.');
  }
  if (!body?.source) {
    errors.push('source es requerido.');
  } else if (!['scanner', 'manual'].includes(body.source)) {
    errors.push('source inválido.');
  }

  return errors;
};

const handler = async (request: NextApiRequest, response: NextApiResponse<CheckInResponse | CheckInListResponse>) => {
  const supabase = getSupabaseServiceClient();

  if (request.method === 'GET') {
    const ceremonyId = request.query.ceremonyId;

    if (!ceremonyId || typeof ceremonyId !== 'string') {
      response.status(400).json({ error: 'ceremonyId es requerido en la consulta.' });
      return;
    }

    const result = await supabase
      .from('checkins')
      .select('id, client_id, invitee_id, ceremony_external_id, ticket_code, scanned_at, source, operator')
      .eq('ceremony_external_id', ceremonyId)
      .order('scanned_at', { ascending: false });

    if (result.error) {
      console.error('[checkins] error recuperando registros', result.error);
      response.status(500).json({ error: 'No fue posible obtener los check-ins.' });
      return;
    }

    const items =
      result.data?.map((row) => ({
        id: row.client_id ?? row.id,
        inviteeId: row.invitee_id,
        ceremonyId: row.ceremony_external_id,
        ticketCode: row.ticket_code,
        scannedAt: row.scanned_at,
        source: (row.source as 'scanner' | 'manual') ?? 'scanner',
        operator: row.operator,
      })) ?? [];

    response.status(200).json({ ok: true, items });
    return;
  }

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'GET, POST');
    response.status(405).json({ error: 'Método no permitido.' });
    return;
  }

  const body = request.body as CheckInRequestBody;
  const errors = validateBody(body);

  if (errors.length) {
    response.status(400).json({ error: errors.join(' ') });
    return;
  }

  const inviteeId = body.inviteeId!;
  const ceremonyExternalId = body.ceremonyId!;
  const ticketCode = body.ticketCode!;
  const scannedAt = new Date(body.scannedAt!);
  const source = body.source!;
  const operator = body.operator ?? null;
  const clientId = body.id ?? randomUUID();

  const existing = await supabase
    .from('checkins')
    .select('id')
    .eq('invitee_id', inviteeId)
    .maybeSingle();

  if (existing.error && existing.error.code !== 'PGRST116') {
    console.error('[checkins] error verificando duplicado', existing.error);
    response.status(500).json({ error: 'Error verificando duplicados.' });
    return;
  }

  if (existing.data) {
    response.status(200).json({ ok: true, duplicate: true, id: existing.data.id });
    return;
  }

  const insert = await supabase
    .from('checkins')
    .insert({
      client_id: clientId,
      invitee_id: inviteeId,
      ceremony_external_id: ceremonyExternalId,
      ticket_code: ticketCode,
      scanned_at: scannedAt.toISOString(),
      source,
      operator,
    })
    .select('id')
    .maybeSingle();

  if (insert.error) {
    console.error('[checkins] error insertando', insert.error);
    if (insert.error.code === '23505') {
      response.status(200).json({ ok: true, duplicate: true, id: clientId });
      return;
    }
    response.status(500).json({ error: insert.error.message || 'No fue posible registrar el check-in.' });
    return;
  }

  response.status(200).json({ ok: true, id: insert.data?.id ?? clientId });
};

export default handler;
