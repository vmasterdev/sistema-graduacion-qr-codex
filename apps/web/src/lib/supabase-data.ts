import { getSupabaseBrowserClient } from './supabase-client';
import { createQrDataUrl } from './tickets';
import type { Ceremony, Invitee, Student } from '@/types';

interface SupabaseInviteeRow {
  id: string;
  name: string;
  document_number: string | null;
  role: 'student' | 'guest';
  ticket_code: string;
  guest_index: number;
  ceremony_external_id: string;
  student_external_id: string;
  created_at: string | null;
  updated_at: string | null;
}

interface SupabaseStudentRow {
  id: string;
  external_id: string;
  ceremony_external_id: string;
  full_name: string;
  document_number: string;
  program: string | null;
  municipality: string | null;
  ceremony_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  invitees: SupabaseInviteeRow[];
}

export const fetchCeremonySnapshot = async (ceremonyId: string) => {
  const supabase = getSupabaseBrowserClient();

  const result = await supabase
    .from('students')
    .select(
      `
        id,
        external_id,
        ceremony_external_id,
        full_name,
        document_number,
        program,
        municipality,
        ceremony_date,
        created_at,
        updated_at,
        invitees (
          id,
          name,
          document_number,
          role,
          ticket_code,
          guest_index,
          ceremony_external_id,
          student_external_id,
          created_at,
          updated_at
        )
      `,
    )
    .eq('ceremony_external_id', ceremonyId)
    .order('full_name', { ascending: true });

  if (result.error) {
    throw new Error(result.error.message || 'No fue posible obtener los estudiantes.');
  }

  const students: Student[] = [];
  const invitees: Invitee[] = [];

  for (const row of (result.data ?? []) as SupabaseStudentRow[]) {
    const mappedInvitees: Invitee[] = [];

    for (const inviteeRow of row.invitees ?? []) {
      const qrCode = await createQrDataUrl(inviteeRow.ticket_code);
      const mappedInvitee: Invitee = {
        id: inviteeRow.id,
        name: inviteeRow.name,
        documentNumber: inviteeRow.document_number ?? undefined,
        ceremonyId: inviteeRow.ceremony_external_id,
        idCeremonia: inviteeRow.ceremony_external_id,
        ticketCode: inviteeRow.ticket_code,
        role: inviteeRow.role,
        idEstudiante: inviteeRow.student_external_id,
        programa: row.program ?? undefined,
        fechaCeremonia: row.ceremony_date ?? undefined,
        municipio: row.municipality ?? undefined,
        guestIndex: inviteeRow.role === 'guest' ? inviteeRow.guest_index : undefined,
        qrCode,
        createdAt: inviteeRow.created_at ?? '',
        updatedAt: inviteeRow.updated_at ?? '',
      };

      mappedInvitees.push(mappedInvitee);
      invitees.push(mappedInvitee);
    }

    const student: Student = {
      id: row.id,
      idEstudiante: row.external_id,
      nombreCompleto: row.full_name,
      numeroDocumento: row.document_number,
      programa: row.program ?? '',
      idCeremonia: row.ceremony_external_id,
      fechaCeremonia: row.ceremony_date ?? '',
      municipio: row.municipality ?? '',
      nombreInvitadoUno: row.invitees?.find((item) => item.role === 'guest' && item.guest_index === 0)?.name,
      documentoInvitadoUno: row.invitees?.find((item) => item.role === 'guest' && item.guest_index === 0)?.document_number ?? undefined,
      nombreInvitadoDos: row.invitees?.find((item) => item.role === 'guest' && item.guest_index === 1)?.name,
      documentoInvitadoDos: row.invitees?.find((item) => item.role === 'guest' && item.guest_index === 1)?.document_number ?? undefined,
      invitees: mappedInvitees,
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
    };

    students.push(student);
  }

  return { students, invitees };
};

export const fetchCeremonies = async (): Promise<Ceremony[]> => {
  const supabase = getSupabaseBrowserClient();

  const result = await supabase
    .from('ceremonies')
    .select('external_id, name, venue, scheduled_at, created_at')
    .order('scheduled_at', { ascending: true });

  if (result.error) {
    throw new Error(result.error.message || 'No fue posible obtener las ceremonias.');
  }

  return (
    result.data?.map((item) => ({
      id: item.external_id,
      name: item.name,
      venue: item.venue,
      scheduledAt: item.scheduled_at,
      timezone: 'America/Bogota',
      templateId: undefined,
    })) ?? []
  );
};
