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

setGlobalOptions({ region: 'us-central1' });

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

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
