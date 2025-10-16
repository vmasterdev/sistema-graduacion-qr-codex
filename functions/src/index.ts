import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import QRCode from 'qrcode';
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2/options';
import { logger } from 'firebase-functions';

type TicketRole = 'student' | 'guest';

interface InviteePayload {
  inviteeId: string;
  ceremonyId: string;
  ticketCode: string;
  scannedAt: string;
  source: 'scanner' | 'manual';
}

interface StudentPayload {
  idEstudiante: string;
  nombreCompleto: string;
  numeroDocumento: string;
  programa: string;
  idCeremonia: string;
  fechaCeremonia: string;
  municipio: string;
  nombreInvitadoUno?: string;
  documentoInvitadoUno?: string;
  nombreInvitadoDos?: string;
  documentoInvitadoDos?: string;
}

interface CeremoniaPayload {
  id_ceremonia: string;
  nombre_ceremonia: string;
  fecha_ceremonia: string;
  lugar_ceremonia: string;
  descripcion?: string;
}

setGlobalOptions({ region: 'us-central1' });

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const CEREMONIAS_USER = process.env.CEREMONIAS_IMPORT_USER ?? 'vanmaster';
const CEREMONIAS_PASS = process.env.CEREMONIAS_IMPORT_PASS ?? 'Vanmaster2025*';
const MAX_CEREMONIAS_BATCH = 500;

const isAuthorized = (authorizationHeader?: string) => {
  if (!authorizationHeader || !authorizationHeader.startsWith('Basic ')) {
    return false;
  }
  const base64 = authorizationHeader.replace('Basic ', '').trim();
  const decoded = Buffer.from(base64, 'base64').toString('utf8');
  const [user, pass] = decoded.split(':');
  return Boolean(user && pass && user === CEREMONIAS_USER && pass === CEREMONIAS_PASS);
};

const normalizeCeremoniesPayload = (payload: unknown): CeremoniaPayload[] => {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { ceremonias?: unknown[] }).ceremonias)) {
    throw new Error('Formato JSON invalido.');
  }

  const ceremonias = (payload as { ceremonias: unknown[] }).ceremonias;
  if (ceremonias.length > MAX_CEREMONIAS_BATCH) {
    throw new Error(`Maximo ${MAX_CEREMONIAS_BATCH} ceremonias por solicitud.`);
  }

  return ceremonias.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Fila ${index + 2}: Formato invalido.`);
    }

    const data = item as Record<string, unknown>;

    const getRequired = (key: keyof CeremoniaPayload, label: string) => {
      const value = data[key];
      if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`Fila ${index + 2}: ${label}`);
      }
      return value.trim();
    };

    const id_ceremonia = getRequired('id_ceremonia', 'id_ceremonia requerido');
    const nombre_ceremonia = getRequired('nombre_ceremonia', 'nombre_ceremonia requerido');
    const fecha_ceremonia = getRequired('fecha_ceremonia', 'fecha_ceremonia requerida');
    const lugar_ceremonia = getRequired('lugar_ceremonia', 'lugar_ceremonia requerido');

    const descripcionValue = data.descripcion;
    const descripcion = typeof descripcionValue === 'string' && descripcionValue.trim() ? descripcionValue.trim() : undefined;

    return {
      id_ceremonia,
      nombre_ceremonia,
      fecha_ceremonia,
      lugar_ceremonia,
      ...(descripcion ? { descripcion } : {}),
    };
  });
};

const writeCheckIn = async (payload: InviteePayload) => {
  const checkInRef = db
    .collection('ceremonies')
    .doc(payload.ceremonyId)
    .collection('checkins')
    .doc(payload.inviteeId);

  const snapshot = await checkInRef.get();
  if (snapshot.exists) {
    return { duplicate: true } as const;
  }

  await checkInRef.set({
    ticketCode: payload.ticketCode,
    scannedAt: admin.firestore.Timestamp.fromDate(new Date(payload.scannedAt)),
    source: payload.source,
  });

  return { duplicate: false } as const;
};

app.post('/checkins', async (request, response) => {
  const payload = request.body as InviteePayload;
  if (!payload?.ceremonyId || !payload?.inviteeId) {
    response.status(400).json({ message: 'Datos incompletos' });
    return;
  }

  try {
    const result = await writeCheckIn(payload);
    response.json({ ok: true, duplicate: result.duplicate });
  } catch (error) {
    logger.error('Error registrando check-in', error);
    response.status(500).json({ message: 'Error interno' });
  }
});

app.post('/sync-checkins', async (request, response) => {
  const payload = request.body as InviteePayload;
  if (!payload?.ceremonyId) {
    response.status(400).json({ message: 'Datos incompletos' });
    return;
  }

  try {
    await writeCheckIn(payload);
    response.json({ ok: true });
  } catch (error) {
    logger.error('Error sincronizando check-in', error);
    response.status(500).json({ message: 'Error interno' });
  }
});

app.post('/ceremonies/import', async (request, response) => {
  if (!isAuthorized(request.headers.authorization ?? undefined)) {
    response.status(401).send('Credenciales invalidas');
    return;
  }

  let ceremonias: CeremoniaPayload[];
  try {
    ceremonias = normalizeCeremoniesPayload(request.body);
  } catch (error) {
    logger.warn('Payload invalido en importacion de ceremonias', error);
    response.status(400).send(error instanceof Error ? error.message : 'Payload invalido.');
    return;
  }

  if (!ceremonias.length) {
    response.json({ ok: true, total: 0 });
    return;
  }

  const marcaDeTiempo = new Date().toISOString();
  const batch = db.batch();

  ceremonias.forEach((ceremonia) => {
    const ref = db.collection('ceremonias').doc(ceremonia.id_ceremonia);
    batch.set(
      ref,
      {
        id_ceremonia: ceremonia.id_ceremonia,
        nombre_ceremonia: ceremonia.nombre_ceremonia,
        fecha_ceremonia: ceremonia.fecha_ceremonia,
        lugar_ceremonia: ceremonia.lugar_ceremonia,
        descripcion: ceremonia.descripcion ?? null,
        creado_en: marcaDeTiempo,
        actualizado_en: marcaDeTiempo,
      },
      { merge: true },
    );
  });

  try {
    await batch.commit();
    response.json({ ok: true, total: ceremonias.length });
  } catch (error) {
    logger.error('Error importando ceremonias', error);
    response.status(500).json({ message: 'Error al importar ceremonias' });
  }
});

app.delete('/ceremonies/:ceremonyId', async (request, response) => {
  if (!isAuthorized(request.headers.authorization ?? undefined)) {
    response.status(401).send('Credenciales invalidas');
    return;
  }

  const { ceremonyId } = request.params;
  if (!ceremonyId) {
    response.status(400).send('ceremonyId requerido');
    return;
  }

  try {
    await db.collection('ceremonias').doc(ceremonyId).delete();
    response.json({ ok: true });
  } catch (error) {
    logger.error('Error eliminando ceremonia', error);
    response.status(500).json({ message: 'Error al eliminar ceremonia' });
  }
});

app.delete('/ceremonies/:ceremonyId/checkins/:inviteeId', async (request, response) => {
  if (!isAuthorized(request.headers.authorization ?? undefined)) {
    response.status(401).send('Credenciales invalidas');
    return;
  }

  const { ceremonyId, inviteeId } = request.params;
  if (!ceremonyId || !inviteeId) {
    response.status(400).send('ceremonyId e inviteeId requeridos');
    return;
  }

  try {
    await db
      .collection('ceremonies')
      .doc(ceremonyId)
      .collection('checkins')
      .doc(inviteeId)
      .delete();
    response.json({ ok: true });
  } catch (error) {
    logger.error('Error eliminando check-in', error);
    response.status(500).json({ message: 'Error al eliminar check-in' });
  }
});

app.post('/tickets/import', async (request, response) => {
  const students = request.body?.students as StudentPayload[];
  if (!Array.isArray(students)) {
    response.status(400).json({ message: 'Payload inválido' });
    return;
  }

  const batch = db.batch();

  students.forEach((student) => {
    const studentRef = db.collection('ceremonies').doc(student.idCeremonia).collection('students').doc(student.idEstudiante);
    batch.set(studentRef, {
      idEstudiante: student.idEstudiante,
      nombreCompleto: student.nombreCompleto,
      numeroDocumento: student.numeroDocumento,
      programa: student.programa,
      fechaCeremonia: student.fechaCeremonia,
      municipio: student.municipio,
      nombreInvitadoUno: student.nombreInvitadoUno ?? null,
      documentoInvitadoUno: student.documentoInvitadoUno ?? null,
      nombreInvitadoDos: student.nombreInvitadoDos ?? null,
      documentoInvitadoDos: student.documentoInvitadoDos ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const invitados = [
      {
        rol: 'student' as TicketRole,
        nombre: student.nombreCompleto,
        documento: student.numeroDocumento,
        invitadoId: student.idEstudiante,
        indice: 0,
      },
      student.nombreInvitadoUno
        ? {
            rol: 'guest' as TicketRole,
            nombre: student.nombreInvitadoUno,
            documento: student.documentoInvitadoUno,
            invitadoId: `${student.idEstudiante}-invitado-1`,
            indice: 1,
          }
        : undefined,
      student.nombreInvitadoDos
        ? {
            rol: 'guest' as TicketRole,
            nombre: student.nombreInvitadoDos,
            documento: student.documentoInvitadoDos,
            invitadoId: `${student.idEstudiante}-invitado-2`,
            indice: 2,
          }
        : undefined,
    ].filter(Boolean) as Array<{ rol: TicketRole; nombre: string; documento?: string; invitadoId: string; indice: number }>;

    invitados.forEach((invitado) => {
      const ticketCode = `${student.idCeremonia}-${invitado.invitadoId}-${Date.now()}`;
      const inviteeRef = db
        .collection('ceremonies')
        .doc(student.idCeremonia)
        .collection('invitees')
        .doc(invitado.invitadoId);

      batch.set(inviteeRef, {
        nombre: invitado.nombre,
        ticketCode,
        rol: invitado.rol,
        documento: invitado.documento ?? null,
        idEstudiante: student.idEstudiante,
        programa: student.programa,
        fechaCeremonia: student.fechaCeremonia,
        municipio: student.municipio,
        indiceInvitado: invitado.indice,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  });

  try {
    await batch.commit();
    response.json({ ok: true });
  } catch (error) {
    logger.error('Error importando estudiantes', error);
    response.status(500).json({ message: 'Error al importar' });
  }
});

export const api = onRequest(app);

export const generateQr = onCall<{ value: string }>(async (request) => {
  const { value } = request.data;
  if (!value) {
    throw new HttpsError('invalid-argument', 'value requerido');
  }

  try {
    const qr = await QRCode.toDataURL(value, { errorCorrectionLevel: 'H', scale: 8 });
    return { qr };
  } catch (error) {
    logger.error('Error generando QR', error);
    throw new HttpsError('internal', 'No se pudo generar el QR');
  }
});
