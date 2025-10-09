'use client';

import { useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { useDashboardStore } from '@/hooks/use-dashboard-store';
import type { Invitee } from '@/types';

const buildCsv = (rows: string[][]) => rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');

const downloadBlob = (content: BlobPart, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const buildInviteeRow = (invitee: Invitee, status: string): string[] => [
  invitee.idEstudiante,
  invitee.name,
  invitee.programa ?? '',
  invitee.role,
  invitee.ticketCode,
  invitee.documentNumber ?? '',
  status,
];

export const ReportsPanel = () => {
  const invitees = useDashboardStore((state) => state.invitees);
  const checkIns = useDashboardStore((state) => state.checkIns);
  const ceremonies = useDashboardStore((state) => state.ceremonies);
  const selectedCeremonyId = useDashboardStore((state) => state.selectedCeremonyId);

  const ceremony = useMemo(
    () => ceremonies.find((item) => item.id === selectedCeremonyId),
    [ceremonies, selectedCeremonyId],
  );

  const checkedMap = useMemo(() => new Map(checkIns.map((log) => [log.inviteeId, log])), [checkIns]);

  const duplicates = useMemo(() => {
    const seen = new Set<string>();
    const duplicatesTickets = new Set<string>();
    invitees.forEach((invitee) => {
      if (seen.has(invitee.ticketCode)) {
        duplicatesTickets.add(invitee.ticketCode);
      }
      seen.add(invitee.ticketCode);
    });
    return Array.from(duplicatesTickets);
  }, [invitees]);

  const checkedInvitees = invitees.filter((invitee) => checkedMap.has(invitee.id));
  const pendingInvitees = invitees.filter((invitee) => !checkedMap.has(invitee.id));

  const exportCsv = () => {
    const header = ['idEstudiante', 'nombre', 'programa', 'municipio', 'fechaCeremonia', 'rol', 'ticket', 'documento', 'estado'];
    const rows = [header];
    checkedInvitees.forEach((invitee) => rows.push(buildInviteeRow(invitee, 'Ingresó')));
    pendingInvitees.forEach((invitee) => rows.push(buildInviteeRow(invitee, 'Pendiente')));
    const csv = buildCsv(rows);
    downloadBlob(csv, `${ceremony?.id ?? 'ceremonia'}-reporte.csv`, 'text/csv;charset=utf-8');
  };

  const exportPdf = () => {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const margin = 40;
    let y = margin;

    pdf.setFontSize(16);
    pdf.text(ceremony?.name ?? 'Ceremonia', margin, y);
    y += 20;
    pdf.setFontSize(10);
    pdf.text(`Ingresos: ${checkedInvitees.length}`, margin, y);
    y += 14;
    pdf.text(`Pendientes: ${pendingInvitees.length}`, margin, y);
    y += 14;
    pdf.text(`Duplicados evitados: ${duplicates.length}`, margin, y);
    y += 30;

    pdf.setFontSize(9);
    pdf.text('Nombre | Rol | Programa | Municipio | Fecha | Ticket | Estado', margin, y);
    y += 14;

    const renderRows = (inviteeList: Invitee[], status: string) => {
      inviteeList.forEach((invitee) => {
        const rowText = `${invitee.name} | ${invitee.role} | ${invitee.programa ?? ''} | ${invitee.ticketCode} | ${status}`;
        pdf.text(rowText, margin, y, { baseline: 'top' });
        y += 14;
        if (y > 800) {
          pdf.addPage();
          y = margin;
        }
      });
    };

    renderRows(checkedInvitees, 'Ingresó');
    renderRows(pendingInvitees, 'Pendiente');

    pdf.save(`${ceremony?.id ?? 'ceremonia'}-reporte.pdf`);
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Reportes en tiempo real</h2>
          <p className="text-sm text-slate-300">
            Descarga reportes en CSV o PDF con el detalle de ingresos, pendientes y duplicados evitados.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-400"
          >
            <FileSpreadsheet className="h-4 w-4" /> CSV
          </button>
          <button
            onClick={exportPdf}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            <FileDown className="h-4 w-4" /> PDF
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Ingresos</p>
          <p className="mt-2 text-3xl font-semibold text-white">{checkedInvitees.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Pendientes</p>
          <p className="mt-2 text-3xl font-semibold text-white">{pendingInvitees.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Duplicados evitados</p>
          <p className="mt-2 text-3xl font-semibold text-white">{duplicates.length}</p>
        </div>
      </div>
    </section>
  );
};

