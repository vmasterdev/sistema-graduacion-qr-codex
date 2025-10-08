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
  studentId: string;
  fullName: string;
  documentNumber: string;
  ceremonyId: string;
  guests: Array<{ name: string; documentNumber?: string }>;
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
    const studentRef = db.collection('ceremonies').doc(student.ceremonyId).collection('students').doc(student.studentId);
    batch.set(studentRef, {
      fullName: student.fullName,
      documentNumber: student.documentNumber,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const allInvitees: Array<{ role: TicketRole; name: string; documentNumber?: string; inviteeId: string }> = [
      { role: 'student', name: student.fullName, documentNumber: student.documentNumber, inviteeId: student.studentId },
      ...student.guests.map((guest, index) => ({
        role: 'guest' as TicketRole,
        name: guest.name,
        documentNumber: guest.documentNumber,
        inviteeId: `${student.studentId}-guest-${index + 1}`,
      })),
    ];

    allInvitees.forEach((invitee) => {
      const ticketCode = `${student.ceremonyId}-${invitee.inviteeId}-${Date.now()}`;
      const inviteeRef = db
        .collection('ceremonies')
        .doc(student.ceremonyId)
        .collection('invitees')
        .doc(invitee.inviteeId);

      batch.set(inviteeRef, {
        name: invitee.name,
        ticketCode,
        role: invitee.role,
        documentNumber: invitee.documentNumber ?? null,
        qrCode: null,
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


