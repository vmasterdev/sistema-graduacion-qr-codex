import type { NextApiRequest, NextApiResponse } from 'next';
import { PassThrough } from 'stream';
import PDFDocument from 'pdfkit';
import JSZip from 'jszip';
import { getSupabaseServiceClient } from '@/lib/supabase-client';
import { appConfig } from '@/lib/config';

const downloadImage = async (path: string) => {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.storage.from(appConfig.supabaseTicketsBucket!).download(path);
  if (error || !data) {
    return null;
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const handler = async (request: NextApiRequest, response: NextApiResponse) => {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Método no permitido.' });
    return;
  }

  if (!appConfig.supabaseUrl || !appConfig.supabaseTicketsBucket) {
    response.status(500).json({ error: 'Configura Supabase y SUPABASE_TICKETS_BUCKET.' });
    return;
  }

  const ceremonyId = request.query.ceremonyId;
  const format = ((request.query.format as string) ?? 'zip').toLowerCase();

  if (!ceremonyId || typeof ceremonyId !== 'string') {
    response.status(400).json({ error: 'ceremonyId es requerido.' });
    return;
  }

  if (!['zip', 'pdf'].includes(format)) {
    response.status(400).json({ error: 'format inválido. Usa zip o pdf.' });
    return;
  }

  const supabase = getSupabaseServiceClient();
  const { data: invitees, error: inviteesError } = await supabase
    .from('invitees')
    .select('id, name, ticket_code, role, ceremony_external_id')
    .eq('ceremony_external_id', ceremonyId)
    .order('name', { ascending: true });

  if (inviteesError) {
    response.status(500).json({ error: inviteesError.message || 'No fue posible obtener los invitados.' });
    return;
  }

  if (!invitees?.length) {
    response.status(404).json({ error: 'No hay invitados para la ceremonia indicada.' });
    return;
  }

  if (format === 'zip') {
    const zip = new JSZip();
    let added = 0;

    for (const invitee of invitees) {
      const path = `${ceremonyId}/${invitee.id}.png`;
      const buffer = await downloadImage(path);
      if (!buffer) {
        continue;
      }
      zip.file(`${invitee.ticket_code}.png`, buffer);
      added += 1;
    }

    if (!added) {
      response.status(404).json({ error: 'No se encontraron imágenes de tarjetas en Storage.' });
      return;
    }

    const archive = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    response.setHeader('Content-Type', 'application/zip');
    response.setHeader('Content-Disposition', `attachment; filename="${ceremonyId}-tarjetas.zip"`);
    response.status(200).send(archive);
    return;
  }

  const doc = new PDFDocument({ autoFirstPage: false, size: 'A4', margin: 36 });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  stream.on('data', (chunk) => chunks.push(chunk));

  const bufferPromise = new Promise<Buffer>((resolve, reject) => {
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });

  doc.pipe(stream);

  for (const invitee of invitees) {
    const path = `${ceremonyId}/${invitee.id}.png`;
    const buffer = await downloadImage(path);
    if (!buffer) {
      continue;
    }
    doc.addPage();
    doc.fontSize(14).text(invitee.name, { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Rol: ${invitee.role} · Ticket: ${invitee.ticket_code}`);
    doc.moveDown(1);
    doc.image(buffer, {
      fit: [500, 500],
      align: 'center',
      valign: 'center',
    });
  }

  doc.end();

  const pdfBuffer = await bufferPromise;
  if (!pdfBuffer.length) {
    response.status(404).json({ error: 'No se encontraron imágenes de tarjetas en Storage.' });
    return;
  }

  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader('Content-Disposition', `attachment; filename="${ceremonyId}-tarjetas.pdf"`);
  response.status(200).send(pdfBuffer);
};

export default handler;
