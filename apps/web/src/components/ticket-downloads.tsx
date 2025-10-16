'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import { Download, FileArchive, FileImage, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useDashboardStore } from '@/hooks/use-dashboard-store';
import { TicketCanvas } from '@/components/ticket-canvas';
import type { Invitee } from '@/types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const triggerDownload = (href: string, filename: string) => {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

const downloadPdf = async (dataUrl: string, filename: string) => {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [860, 540] });
  const imageProps = pdf.getImageProperties(dataUrl);
  const width = 820;
  const height = (imageProps.height * width) / imageProps.width;
  pdf.addImage(dataUrl, 'PNG', 20, 20, width, height);
  pdf.save(filename);
};

export const TicketDownloads = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const invitees = useDashboardStore((state) => state.invitees);
  const templates = useDashboardStore((state) => state.templates);
  const ceremonies = useDashboardStore((state) => state.ceremonies);
  const selectedCeremonyId = useDashboardStore((state) => state.selectedCeremonyId);
  const selectedTemplateId = useDashboardStore((state) => state.selectedTemplateId);

  const ceremony = useMemo(
    () => ceremonies.find((item) => item.id === selectedCeremonyId),
    [ceremonies, selectedCeremonyId],
  );

  const template = useMemo(
    () => templates.find((item) => item.id === selectedTemplateId),
    [templates, selectedTemplateId],
  );

  const inviteesForCeremony = useMemo(() => (selectedCeremonyId ? invitees.filter((invitee) => invitee.ceremonyId === selectedCeremonyId) : invitees), [invitees, selectedCeremonyId]);

  const [previewInvitee, setPreviewInvitee] = useState<Invitee | undefined>(inviteesForCeremony[0]);

  useEffect(() => {
    setPreviewInvitee(inviteesForCeremony[0]);
  }, [inviteesForCeremony]);

  const ensureReady = () => {
    if (!template) {
      alert('Diseña o selecciona una plantilla antes de exportar.');
      return false;
    }
    if (!inviteesForCeremony.length) {
      alert('Carga estudiantes para generar tarjetas.');
      return false;
    }
    return true;
  };

  const captureInvitee = async (invitee: Invitee) => {
    setPreviewInvitee(invitee);
    await sleep(40);
    if (!canvasRef.current) return undefined;
    return toPng(canvasRef.current, {
      cacheBust: true,
      pixelRatio: window.devicePixelRatio > 1 ? window.devicePixelRatio : 2,
    });
  };

  const handleDownloadPng = async () => {
    if (!ensureReady()) return;
    setIsDownloading(true);
    try {
      const dataUrl = await captureInvitee(inviteesForCeremony[0]);
      if (dataUrl) {
        triggerDownload(dataUrl, `${inviteesForCeremony[0].ticketCode}.png`);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!ensureReady()) return;
    setIsDownloading(true);
    try {
      const dataUrl = await captureInvitee(inviteesForCeremony[0]);
      if (dataUrl) {
        await downloadPdf(dataUrl, `${inviteesForCeremony[0].ticketCode}.pdf`);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadBatch = async () => {
    if (!ensureReady()) return;
    setIsDownloading(true);
    try {
      const zip = new JSZip();
      for (const invitee of inviteesForCeremony) {
        const dataUrl = await captureInvitee(invitee);
        if (!dataUrl) continue;
        const base64 = dataUrl.split(',')[1];
        zip.file(`${invitee.ticketCode}.png`, base64, { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${ceremony?.id ?? 'ceremonia'}-tarjetas.zip`);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } finally {
      setIsDownloading(false);
      setPreviewInvitee(inviteesForCeremony[0]);
    }
  };

  if (!template) {
    return (
      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
        Diseña una plantilla para habilitar las descargas masivas.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Descarga de tarjetas</h2>
          <p className="text-sm text-slate-300">
             tarjetas listas · Plantilla {template.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadPng}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />} PNG
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} PDF
          </button>
          <button
            onClick={handleDownloadBatch}
            disabled={isDownloading}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />} ZIP lote
          </button>
        </div>
      </div>

      <div className="mt-6">
        {previewInvitee ? (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Vista previa dinámica</p>
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex justify-center">
                <div className="scale-75 transform origin-top" ref={canvasRef}>
                  <TicketCanvas invitee={previewInvitee} template={template} ceremony={ceremony} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Carga estudiantes para generar tarjetas.</p>
        )}
      </div>
    </section>
  );
};



