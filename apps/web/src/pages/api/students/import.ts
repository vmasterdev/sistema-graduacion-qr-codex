import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseServiceClient } from '@/lib/supabase-client';
import { generateTicketCode } from '@/lib/tickets';
import type { CsvStudentRow } from '@/types';

interface ImportResponse {
  ok: true;
  students: number;
  invitees: number;
}

interface ErrorResponse {
  error: string;
}

interface NormalizedRow {
  ceremonyId: string;
  studentId: string;
  fullName: string;
  documentNumber: string;
  program?: string;
  municipality?: string;
  ceremonyDate?: string;
  guestOne?: {
    name: string;
    document?: string;
  };
  guestTwo?: {
    name: string;
    document?: string;
  };
}

const normalizeRows = (rows: CsvStudentRow[]): NormalizedRow[] => {
  return rows.map((row, index) => {
    const ceremonyId = (row.idCeremonia ?? '').trim();
    if (!ceremonyId) {
      throw new Error(`Fila ${index + 2}: idCeremonia es obligatorio.`);
    }

    const studentId = (row.idEstudiante ?? '').trim();
    if (!studentId) {
      throw new Error(`Fila ${index + 2}: idEstudiante es obligatorio.`);
    }

    const fullName = (row.nombreCompleto ?? '').trim();
    if (!fullName) {
      throw new Error(`Fila ${index + 2}: nombreCompleto es obligatorio.`);
    }

    const documentNumber = (row.numeroDocumento ?? '').trim();
    if (!documentNumber) {
      throw new Error(`Fila ${index + 2}: numeroDocumento es obligatorio.`);
    }

    const ceremonyDate = row.fechaCeremonia?.trim();
    if (ceremonyDate && Number.isNaN(new Date(ceremonyDate).getTime())) {
      throw new Error(`Fila ${index + 2}: fechaCeremonia inválida (${row.fechaCeremonia}).`);
    }

    const guestOneName = row.nombreInvitadoUno?.trim();
    const guestTwoName = row.nombreInvitadoDos?.trim();

    return {
      ceremonyId,
      studentId,
      fullName,
      documentNumber,
      program: row.programa?.trim() || undefined,
      municipality: row.municipio?.trim() || undefined,
      ceremonyDate: ceremonyDate || undefined,
      guestOne: guestOneName
        ? {
            name: guestOneName,
            document: row.documentoInvitadoUno?.trim() || undefined,
          }
        : undefined,
      guestTwo: guestTwoName
        ? {
            name: guestTwoName,
            document: row.documentoInvitadoDos?.trim() || undefined,
          }
        : undefined,
    };
  });
};

const handler = async (request: NextApiRequest, response: NextApiResponse<ImportResponse | ErrorResponse>) => {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).json({ error: 'Método no permitido.' });
    return;
  }

  const rows = (request.body?.rows ?? []) as CsvStudentRow[];

  if (!Array.isArray(rows) || !rows.length) {
    response.status(400).json({ error: 'Debes enviar al menos una fila para importar.' });
    return;
  }

  let normalized: NormalizedRow[];
  try {
    normalized = normalizeRows(rows);
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : 'Datos inválidos en el CSV.' });
    return;
  }

  const supabase = getSupabaseServiceClient();

  const studentsPayload = normalized.map((row) => ({
    external_id: row.studentId,
    ceremony_external_id: row.ceremonyId,
    full_name: row.fullName,
    document_number: row.documentNumber,
    program: row.program ?? null,
    municipality: row.municipality ?? null,
    ceremony_date: row.ceremonyDate ?? null,
  }));

  const studentsResult = await supabase.from('students').upsert(studentsPayload, {
    onConflict: 'ceremony_external_id,external_id',
  });

  if (studentsResult.error) {
    console.error('[students/import] error upsert students', studentsResult.error);
    response.status(500).json({ error: studentsResult.error.message || 'No fue posible guardar estudiantes.' });
    return;
  }

  const studentMap = new Map<string, { id: string }>();
  for (const student of studentsResult.data ?? []) {
    studentMap.set(`${student.ceremony_external_id}::${student.external_id}`, { id: student.id });
  }

  const inviteesPayload = normalized.flatMap((row) => {
    const key = `${row.ceremonyId}::${row.studentId}`;
    const student = studentMap.get(key);
    if (!student) {
      throw new Error(`No se pudo obtener el ID del estudiante ${row.studentId} (${row.ceremonyId}).`);
    }

    const baseInvitees = [
      {
        student_id: student.id,
        student_external_id: row.studentId,
        ceremony_external_id: row.ceremonyId,
        name: row.fullName,
        document_number: row.documentNumber,
        role: 'student',
        ticket_code: generateTicketCode(row.ceremonyId, `${row.studentId}-student`),
        guest_index: -1,
        program: row.program ?? null,
        municipality: row.municipality ?? null,
        ceremony_date: row.ceremonyDate ?? null,
      },
    ];

    const guestInvitees = [row.guestOne, row.guestTwo]
      .map((guest, index) =>
        guest
          ? {
              student_id: student.id,
              student_external_id: row.studentId,
              ceremony_external_id: row.ceremonyId,
              name: guest.name,
              document_number: guest.document ?? null,
              role: 'guest',
              ticket_code: generateTicketCode(row.ceremonyId, `${row.studentId}-guest-${index + 1}`),
              guest_index: index,
              program: row.program ?? null,
              municipality: row.municipality ?? null,
              ceremony_date: row.ceremonyDate ?? null,
            }
          : undefined,
      )
      .filter(Boolean) as Array<{
      student_id: string;
      student_external_id: string;
      ceremony_external_id: string;
      name: string;
      document_number: string | null;
      role: string;
      ticket_code: string;
      guest_index: number;
      program: string | null;
      municipality: string | null;
      ceremony_date: string | null;
    }>;

    return [...baseInvitees, ...guestInvitees];
  });

  let inviteesCount = 0;
  if (inviteesPayload.length) {
    const inviteesResult = await supabase
      .from('invitees')
      .upsert(inviteesPayload, {
        onConflict: 'ceremony_external_id,student_external_id,role,guest_index',
        returning: 'minimal',
      });

    if (inviteesResult.error) {
      console.error('[students/import] error upsert invitees', inviteesResult.error);
      response.status(500).json({ error: inviteesResult.error.message || 'No fue posible guardar invitados.' });
      return;
    }

    inviteesCount = inviteesPayload.length;
  }

  response.status(200).json({
    ok: true,
    students: studentsPayload.length,
    invitees: inviteesCount,
  });
};

export default handler;
