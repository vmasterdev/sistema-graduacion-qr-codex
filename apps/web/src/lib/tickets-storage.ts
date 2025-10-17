import { appConfig } from './config';

interface UploadTicketOptions {
  inviteeId: string;
  ceremonyId: string;
  dataUrl: string;
  mimeType?: string;
}

interface UploadTicketResult {
  ok: true;
  url: string;
}

export const uploadTicketImage = async ({ inviteeId, ceremonyId, dataUrl, mimeType }: UploadTicketOptions) => {
  if (!appConfig.supabaseUrl || !appConfig.supabaseAnonKey || !appConfig.supabaseTicketsBucket) {
    return null;
  }

  try {
    const response = await fetch('/api/tickets/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inviteeId, ceremonyId, dataUrl, mimeType }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as UploadTicketResult;
    return payload?.url ?? null;
  } catch (error) {
    console.error('Error subiendo ticket a Supabase Storage', error);
    return null;
  }
};
