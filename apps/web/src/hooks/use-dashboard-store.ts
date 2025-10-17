'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  AccessLog,
  Ceremony,
  CsvStudentRow,
  Invitee,
  Student,
  TicketAssignment,
  TicketTemplate,
} from '@/types';
import { createQrDataUrl, generateTicketCode, mapInviteeToTicket } from '@/lib/tickets';
import { appConfig } from '@/lib/config';
import { fetchCeremonySnapshot } from '@/lib/supabase-data';

interface DashboardState {
  ceremonies: Ceremony[];
  selectedCeremonyId?: string;
  students: Student[];
  invitees: Invitee[];
  templates: TicketTemplate[];
  selectedTemplateId?: string;
  ticketAssignments: TicketAssignment[];
  checkIns: AccessLog[];
  isProcessingCsv: boolean;
  importError?: string;
  setCeremonies: (ceremonies: Ceremony[]) => void;
  selectCeremony: (ceremonyId: string) => void;
  upsertTemplate: (template: TicketTemplate) => void;
  selectTemplate: (templateId: string) => void;
  ingestCsvRows: (rows: CsvStudentRow[]) => Promise<void>;
  setImportError: (message?: string) => void;
  markTicketDownloaded: (inviteeId: string, url: string) => void;
  appendCheckIn: (record: AccessLog) => void;
  setCheckIns: (records: AccessLog[]) => void;
  refreshCeremonyData: (ceremonyId: string) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>()(
  devtools((set, get) => ({
    ceremonies: [],
    students: [],
    invitees: [],
    templates: [],
    ticketAssignments: [],
    checkIns: [],
    isProcessingCsv: false,
    setCeremonies: (ceremonies) =>
      set({
        ceremonies,
        selectedCeremonyId: ceremonies[0]?.id ?? get().selectedCeremonyId,
      }),
    selectCeremony: (ceremonyId) => set({ selectedCeremonyId: ceremonyId }),
    upsertTemplate: (template) => {
      const templates = get().templates;
      const exists = templates.find((item) => item.id === template.id);
      if (exists) {
        set({
          templates: templates.map((item) => (item.id === template.id ? template : item)),
          selectedTemplateId: template.id,
        });
      } else {
        set({ templates: [...templates, template], selectedTemplateId: template.id });
      }
    },
    selectTemplate: (templateId) => set({ selectedTemplateId: templateId }),
    ingestCsvRows: async (rows) => {
      const { selectedCeremonyId, selectedTemplateId, templates } = get();

      set({ isProcessingCsv: true, importError: undefined });
      try {
        if (appConfig.supabaseUrl && appConfig.supabaseAnonKey) {
          const rowsWithCeremony = rows.map((row, index) => {
            if (row.idCeremonia?.trim()) {
              return row;
            }
            if (!selectedCeremonyId) {
              throw new Error(
                `Fila ${index + 2}: falta idCeremonia y no hay ceremonia seleccionada para aplicar por defecto.`,
              );
            }
            return { ...row, idCeremonia: selectedCeremonyId };
          });

          const ceremonyIds = new Set<string>();
          rowsWithCeremony.forEach((row) => {
            if (row.idCeremonia) {
              ceremonyIds.add(row.idCeremonia.trim());
            }
          });

          const response = await fetch('/api/students/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ rows: rowsWithCeremony }),
          });

          if (!response.ok) {
            const payload = await response.json().catch(() => null);
            const message =
              typeof payload?.error === 'string'
                ? payload.error
                : `No fue posible importar estudiantes (${response.status}).`;
            throw new Error(message);
          }

          for (const ceremonyId of ceremonyIds) {
            await get().refreshCeremonyData(ceremonyId);
          }
          return;
        }

        const students: Student[] = [];
        const invitees: Invitee[] = [];

        for (const row of rows) {
          const ceremonyFromRow = row.idCeremonia?.trim();
          const ceremonyId = ceremonyFromRow || selectedCeremonyId;
          if (!ceremonyId) {
            throw new Error('Cada fila debe incluir un idCeremonia o debe seleccionarse una ceremonia activa.');
          }

          if (selectedCeremonyId && ceremonyFromRow && ceremonyFromRow !== selectedCeremonyId) {
            console.warn('Fila importada con idCeremonia distinto al seleccionado actualmente. Se respetará el valor del CSV.');
          }

          const studentInviteeId = crypto.randomUUID();
          const studentTicketCode = generateTicketCode(ceremonyId);
          const studentQr = await createQrDataUrl(studentTicketCode);

          const studentInvitee: Invitee = {
            id: studentInviteeId,
            name: row.nombreCompleto,
            documentNumber: row.numeroDocumento,
            ceremonyId,
            idCeremonia: ceremonyId,
            ticketCode: studentTicketCode,
            role: 'student',
            idEstudiante: row.idEstudiante,
            programa: row.programa,
            fechaCeremonia: row.fechaCeremonia,
            municipio: row.municipio,
            qrCode: studentQr,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const guestEntries: Invitee[] = [];
          const guestSeeds = [
            { nombre: row.nombreInvitadoUno, documento: row.documentoInvitadoUno, index: 0 },
            { nombre: row.nombreInvitadoDos, documento: row.documentoInvitadoDos, index: 1 },
          ];

          guestSeeds.forEach((guest) => {
            if (!guest.nombre) {
              return;
            }
            const guestTicketCode = generateTicketCode(ceremonyId);
            const invitee: Invitee = {
              id: crypto.randomUUID(),
              name: guest.nombre,
              documentNumber: guest.documento,
              ceremonyId,
              idCeremonia: ceremonyId,
              ticketCode: guestTicketCode,
              role: 'guest',
              idEstudiante: row.idEstudiante,
              programa: row.programa,
              fechaCeremonia: row.fechaCeremonia,
              municipio: row.municipio,
              guestIndex: guest.index,
              qrCode: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            guestEntries.push(invitee);
          });

          invitees.push(studentInvitee);
          students.push({
            id: crypto.randomUUID(),
            idEstudiante: row.idEstudiante,
            nombreCompleto: row.nombreCompleto,
            numeroDocumento: row.numeroDocumento,
            programa: row.programa,
            idCeremonia: ceremonyId,
            fechaCeremonia: row.fechaCeremonia,
            municipio: row.municipio,
            nombreInvitadoUno: row.nombreInvitadoUno,
            documentoInvitadoUno: row.documentoInvitadoUno,
            nombreInvitadoDos: row.nombreInvitadoDos,
            documentoInvitadoDos: row.documentoInvitadoDos,
            invitees: [studentInvitee, ...guestEntries],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });

          invitees.push(...guestEntries);
        }

        const updatedInvitees = await Promise.all(
          invitees.map(async (invitee) => {
            if (invitee.qrCode) {
              return invitee;
            }
            const qrCode = await createQrDataUrl(invitee.ticketCode);
            return { ...invitee, qrCode };
          }),
        );

        let ticketAssignments: TicketAssignment[] = [];
        if (selectedTemplateId) {
          const template = templates.find((item) => item.id === selectedTemplateId);
          if (template) {
            ticketAssignments = await Promise.all(
              updatedInvitees.map((invitee) => mapInviteeToTicket(invitee, template)),
            );
          }
        }

        set({ students, invitees: updatedInvitees, ticketAssignments });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error inesperado al importar CSV';
        set({ importError: message });
        throw error;
      } finally {
        set({ isProcessingCsv: false });
      }
    },
    setImportError: (message) => set({ importError: message }),
    markTicketDownloaded: (inviteeId, url) => {
      set({
        ticketAssignments: get().ticketAssignments.map((assignment) =>
          assignment.inviteeId === inviteeId ? { ...assignment, downloadUrl: url } : assignment,
        ),
      });
    },
    appendCheckIn: (record) => {
      const current = get().checkIns;
      const exists = current.find((item) => item.inviteeId === record.inviteeId);
      if (exists) {
        return;
      }
      set({ checkIns: [...current, record] });
    },
    setCheckIns: (records) => set({ checkIns: records }),
    refreshCeremonyData: async (ceremonyId) => {
      if (!appConfig.supabaseUrl || !appConfig.supabaseAnonKey) {
        return;
      }

      const { templates, selectedTemplateId } = get();
      const { students, invitees } = await fetchCeremonySnapshot(ceremonyId);

      let ticketAssignments: TicketAssignment[] = [];
      if (selectedTemplateId) {
        const template = templates.find((item) => item.id === selectedTemplateId);
        if (template) {
          ticketAssignments = await Promise.all(invitees.map((invitee) => mapInviteeToTicket(invitee, template)));
        }
      }

      set({
        students,
        invitees,
        ticketAssignments,
      });
    },
  })),
);
