'use client';

import { useMemo } from 'react';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { useDashboardStore } from '@/hooks/use-dashboard-store';

export const ReportsPanel = () => {
  const invitees = useDashboardStore((state) => state.invitees);
  const checkIns = useDashboardStore((state) => state.checkIns);
  const selectedCeremonyId = useDashboardStore((state) => state.selectedCeremonyId);

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

  const downloadRemoteReport = async (format: 'csv' | 'pdf') => {
    if (!selectedCeremonyId) {
      return;
    }

    const query = new URLSearchParams({ ceremonyId: selectedCeremonyId, format });
    const response = await fetch(`/api/reports/ceremony?${query.toString()}`);
    if (!response.ok) {
      console.error('No se pudo descargar el reporte', response.status);
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selectedCeremonyId}-reporte.${format}`;
    anchor.click();
    URL.revokeObjectURL(url);
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
            onClick={() => void downloadRemoteReport('csv')}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-400"
          >
            <FileSpreadsheet className="h-4 w-4" /> CSV
          </button>
          <button
            onClick={() => void downloadRemoteReport('pdf')}
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

