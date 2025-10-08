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
      if (!selectedCeremonyId) {
        throw new Error('Seleccione una ceremonia antes de importar.');
      }

      set({ isProcessingCsv: true, importError: undefined });
      try {
        const students: Student[] = [];
        const invitees: Invitee[] = [];

        for (const row of rows) {
          const studentInviteeId = crypto.randomUUID();
          const studentTicketCode = generateTicketCode(selectedCeremonyId);
          const studentQr = await createQrDataUrl(studentTicketCode);

          const studentInvitee: Invitee = {
            id: studentInviteeId,
            name: row.fullName,
            documentNumber: row.documentNumber,
            ceremonyId: selectedCeremonyId,
            ticketCode: studentTicketCode,
            role: 'student',
            studentId: row.studentId,
            qrCode: studentQr,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const guestEntries: Invitee[] = [];
          const guestSeeds = [
            { name: row.guestOneName, document: row.guestOneDocument, index: 0 },
            { name: row.guestTwoName, document: row.guestTwoDocument, index: 1 },
          ];

          guestSeeds.forEach((guest) => {
            if (!guest.name) {
              return;
            }
            const guestTicketCode = generateTicketCode(selectedCeremonyId);
            const invitee: Invitee = {
              id: crypto.randomUUID(),
              name: guest.name,
              documentNumber: guest.document,
              ceremonyId: selectedCeremonyId,
              ticketCode: guestTicketCode,
              role: 'guest',
              studentId: row.studentId,
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
            studentId: row.studentId,
            fullName: row.fullName,
            documentNumber: row.documentNumber,
            ceremonyId: selectedCeremonyId,
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
  })),
);
