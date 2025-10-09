import type { NextApiRequest, NextApiResponse } from 'next';
import { collection, doc, getFirestore, writeBatch } from 'firebase/firestore';
import { CeremoniaCsvRow, CeremoniaCsvSchema } from '@/types/ceremonia-import';
import { getFirebaseApp } from '@/lib/firebase';

type CeremoniasPayload = { ceremonias: unknown[] };

const USUARIO = process.env.CEREMONIAS_IMPORT_USER;
const CONTRASENA = process.env.CEREMONIAS_IMPORT_PASS;

const esPayloadCeremonias = (valor: unknown): valor is CeremoniasPayload => {
  return Boolean(valor && typeof valor === 'object' && Array.isArray((valor as CeremoniasPayload).ceremonias));
};

const validarCredenciales = (authorizationHeader?: string) => {
  if (!authorizationHeader || !authorizationHeader.startsWith('Basic ')) {
    return false;
  }
  const base64 = authorizationHeader.replace('Basic ', '').trim();
  const decoded = Buffer.from(base64, 'base64').toString('utf8');
  const [user, pass] = decoded.split(':');
  return Boolean(user && pass && user === USUARIO && pass === CONTRASENA);
};

const normalizarCeremonias = (payload: unknown): CeremoniaCsvRow[] => {
  if (!esPayloadCeremonias(payload)) {
    throw new Error('Formato JSON invalido.');
  }

  return payload.ceremonias.map((fila, indice) => {
    const resultado = CeremoniaCsvSchema.safeParse(fila);
    if (!resultado.success) {
      const errores = resultado.error.issues.map((issue) => issue.message).join(', ');
      throw new Error('Fila ' + (indice + 2) + ': ' + errores);
    }
    return resultado.data;
  });
};

const firestore = getFirestore(getFirebaseApp());

const handler = async (request: NextApiRequest, response: NextApiResponse) => {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).end('Metodo no permitido');
  }

  if (!validarCredenciales(request.headers.authorization)) {
    return response.status(401).end('Credenciales invalidas');
  }

  try {
    const ceremonias = normalizarCeremonias(request.body);
    const batch = writeBatch(firestore);

    ceremonias.forEach((ceremonia) => {
      const ceremoniaRef = doc(collection(firestore, 'ceremonias'), ceremonia.id_ceremonia);
      const marcaDeTiempo = new Date().toISOString();
      batch.set(ceremoniaRef, {
        id_ceremonia: ceremonia.id_ceremonia,
        nombre_ceremonia: ceremonia.nombre_ceremonia,
        fecha_ceremonia: ceremonia.fecha_ceremonia,
        lugar_ceremonia: ceremonia.lugar_ceremonia,
        descripcion: ceremonia.descripcion ?? null,
        creado_en: marcaDeTiempo,
        actualizado_en: marcaDeTiempo,
      }, { merge: true });
    });

    await batch.commit();
    return response.status(200).json({ ok: true, total: ceremonias.length });
  } catch (error) {
    console.error('Error importando ceremonias', error);
    const message = error instanceof Error ? error.message : 'Error inesperado al importar ceremonias.';
    return response.status(400).send(message);
  }
};

export default handler;
