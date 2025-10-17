import type { NextApiRequest, NextApiResponse } from 'next';
import { Buffer } from 'node:buffer';
import { getSupabaseServiceClient } from '@/lib/supabase-client';
import { appConfig } from '@/lib/config';

interface UploadRequest {
  inviteeId?: string;
  ceremonyId?: string;
  dataUrl?: string;
  mimeType?: string;
}

type UploadResponse =
  | {
      ok: true;
      url: string;
      path: string;
    }
  | {
      error: string;
    };

const parseDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(.+);base64,(.*)$/);
  if (!match) {
    throw new Error('Formato de imagen inválido.');
  }
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], 'base64'),
  };
};

const handler = async (request: NextApiRequest, response: NextApiResponse<UploadResponse>) => {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Método no permitido.' });
    return;
  }

  if (!appConfig.supabaseTicketsBucket) {
    response.status(500).json({ error: 'Configura SUPABASE_TICKETS_BUCKET.' });
    return;
  }

  const { inviteeId, ceremonyId, dataUrl, mimeType } = request.body as UploadRequest;

  if (!inviteeId || !ceremonyId || !dataUrl) {
    response.status(400).json({ error: 'inviteeId, ceremonyId y dataUrl son requeridos.' });
    return;
  }

  try {
    const { buffer, mimeType: detectedMime } = parseDataUrl(dataUrl);
    const contentType = mimeType || detectedMime || 'image/png';
    const supabase = getSupabaseServiceClient();

    const path = `${ceremonyId}/${inviteeId}.png`;
    const uploadResult = await supabase.storage.from(appConfig.supabaseTicketsBucket).upload(path, buffer, {
      contentType,
      upsert: true,
    });

    if (uploadResult.error) {
      console.error('[tickets/upload] error subiendo archivo', uploadResult.error);
      response.status(500).json({ error: uploadResult.error.message || 'No fue posible guardar la tarjeta.' });
      return;
    }

    const { data } = supabase.storage.from(appConfig.supabaseTicketsBucket).getPublicUrl(path);
    response.status(200).json({ ok: true, url: data.publicUrl, path });
  } catch (error) {
    console.error('[tickets/upload] error inesperado', error);
    response.status(500).json({ error: error instanceof Error ? error.message : 'Error inesperado al subir la tarjeta.' });
  }
};

export default handler;
