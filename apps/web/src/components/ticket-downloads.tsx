'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileArchive, FileImage, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useDashboardStore } from '@/hooks/use-dashboard-store';
import { TicketCanvas } from '@/components/ticket-canvas';
import type { Invitee } from '@/types';
import { uploadTicketImage } from '@/lib/tickets-storage';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';
import { appConfig } from '@/lib/config';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const triggerDownload = (href: string, filename: string) => {
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

export const TicketDownloads = () => {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const invitees = useDashboardStore((state) => state.invitees);
  const templates = useDashboardStore((state) => state.templates);
  const ceremonies = useDashboardStore((state) => state.ceremonies);
  const selectedCeremonyId = useDashboardStore((state) => state.selectedCeremonyId);
  const selectedTemplateId = useDashboardStore((state) => state.selectedTemplateId);

  const supabaseRef = useRef<ReturnType<typeof getSupabaseBrowserClient>>();

  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = getSupabaseBrowserClient();
    }
    return supabaseRef.current;
  };

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
    const dataUrl = await toPng(canvasRef.current, {
      cacheBust: true,
      pixelRatio: window.devicePixelRatio > 1 ? window.devicePixelRatio : 2,
    });
    void uploadTicketImage({
      inviteeId: invitee.id,
      ceremonyId: invitee.ceremonyId,
      dataUrl,
      mimeType: 'image/png',
    });
    return dataUrl;
  };

  const getStoredTicketUrl = async (invitee: Invitee) => {
    if (!appConfig.supabaseUrl || !appConfig.supabaseTicketsBucket) {
      return null;
    }

    const supabase = getSupabase();
    const path = `${invitee.ceremonyId}/${invitee.id}.png`;
    const { data } = supabase.storage.from(appConfig.supabaseTicketsBucket).getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) {
      return null;
    }

    const headResponse = await fetch(publicUrl, { method: 'HEAD' });
    if (!headResponse.ok) {
      return null;
    }

    return publicUrl;
  };

  const ensureInviteeStored = async (invitee: Invitee) => {
    const existing = await getStoredTicketUrl(invitee);
    if (existing) {
      return existing;
    }

    const dataUrl = await captureInvitee(invitee);
    if (!dataUrl) {
      return null;
    }

    return (await getStoredTicketUrl(invitee)) ?? dataUrl;
  };

  const ensureAllStored = async () => {
    await Promise.all(inviteesForCeremony.map((invitee) => ensureInviteeStored(invitee)));
  };

  const handleDownloadPng = async () => {
    if (!ensureReady()) return;
    setIsDownloading(true);
    try {
      const invitee = inviteesForCeremony[0];
      const storedUrl = await ensureInviteeStored(invitee);
      if (storedUrl) {
        triggerDownload(storedUrl, `${invitee.ticketCode}.png`);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!ensureReady() || !selectedCeremonyId) return;
    setIsDownloading(true);
    try {
      await ensureAllStored();
      const response = await fetch(`/api/tickets/batch?ceremonyId=${encodeURIComponent(selectedCeremonyId)}&format=pdf`);
      if (!response.ok) {
        console.error('No fue posible generar el PDF', response.status);
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${selectedCeremonyId}-tarjetas.pdf`);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadBatch = async () => {
    if (!ensureReady() || !selectedCeremonyId) return;
    setIsDownloading(true);
    try {
      await ensureAllStored();
      const response = await fetch(`/api/tickets/batch?ceremonyId=${encodeURIComponent(selectedCeremonyId)}&format=zip`);
      if (!response.ok) {
        console.error('No fue posible generar el ZIP', response.status);
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      triggerDownload(url, `${selectedCeremonyId}-tarjetas.zip`);
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



