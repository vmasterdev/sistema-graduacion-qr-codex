import { NextRequest, NextResponse } from 'next/server';
import { getFunctionsUrl } from '@/lib/config';
import type { AccessLog } from '@/types';

export async function POST(request: NextRequest) {
  if (!request.body) {
    console.warn('Check-in endpoint sin cuerpo');
    return NextResponse.json({ message: 'Payload requerido' }, { status: 400 });
  }

  let payload: AccessLog | undefined;
  try {
    payload = (await request.json()) as AccessLog;
  } catch (error) {
    console.error('Check-in payload inválido', error);
    return NextResponse.json({ message: 'Payload inválido' }, { status: 400 });
  }

  if (!payload?.ticketCode) {
    return NextResponse.json({ message: 'ticketCode requerido' }, { status: 400 });
  }

  let endpoint: URL | undefined;
  try {
    endpoint = new URL(getFunctionsUrl('/checkins'));
  } catch (error) {
    console.error('Config de funciones no disponible', error);
    return NextResponse.json({ message: 'Configura CHECKINS_FUNCTION_URL' }, { status: 501 });
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('x-app-check') ? { 'X-Firebase-AppCheck': request.headers.get('x-app-check')! } : {}),
        ...(request.headers.get('authorization') ? { Authorization: request.headers.get('authorization')! } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      console.error('Error remoto check-in', response.status, message);
      return NextResponse.json({ message: 'Error remoto al guardar check-in' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Fallo llamando función de check-in', error);
    return NextResponse.json({ message: 'No se pudo contactar el backend' }, { status: 502 });
  }
}
