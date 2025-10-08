'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, CheckCircle2, RefreshCw, Search, XCircle } from 'lucide-react';
import { queueCheckIn } from '@/lib/offlineQueue';
import { getAppCheckToken } from '@/lib/firebase';
import { useDashboardStore } from '@/hooks/use-dashboard-store';
import type { AccessLog, Invitee } from '@/types';

interface ScannerStatus {
  type: 'success' | 'error' | 'info';
  message: string;
}

const filterInvitees = (invitees: Invitee[], query: string) => {
  if (!query.trim()) return [];
  const normalised = query.toLowerCase();
  return invitees.filter((invitee) => {
    return (
      invitee.name.toLowerCase().includes(normalised) ||
      invitee.ticketCode.toLowerCase().includes(normalised) ||
      invitee.studentId.toLowerCase().includes(normalised) ||
      (invitee.documentNumber ?? '').toLowerCase().includes(normalised)
    );
  });
};

export const AccessControlPanel = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [status, setStatus] = useState<ScannerStatus>();
  const [query, setQuery] = useState('');
  const invitees = useDashboardStore((state) => state.invitees);
  const ceremonies = useDashboardStore((state) => state.ceremonies);
  const selectedCeremonyId = useDashboardStore((state) => state.selectedCeremonyId);
  const appendCheckIn = useDashboardStore((state) => state.appendCheckIn);
  const checkIns = useDashboardStore((state) => state.checkIns);

  const ceremony = useMemo(() => ceremonies.find((item) => item.id === selectedCeremonyId), [ceremonies, selectedCeremonyId]);

  const alreadyCheckedIds = useMemo(() => new Set(checkIns.map((log) => log.inviteeId)), [checkIns]);

  const handleResult = useCallback(
    async (ticketCode: string) => {
      const invitee = invitees.find((item) => item.ticketCode === ticketCode);
      if (!invitee) {
        setStatus({ type: 'error', message: `Ticket ${ticketCode} no pertenece a esta ceremonia.` });
        return;
      }

      if (alreadyCheckedIds.has(invitee.id)) {
        setStatus({ type: 'error', message: `${invitee.name} ya registr√≥ ingreso.` });
        return;
      }

      const record: AccessLog = {
        id: crypto.randomUUID(),
        inviteeId: invitee.id,
        ticketCode: invitee.ticketCode,
        ceremonyId: invitee.ceremonyId,
        scannedAt: new Date().toISOString(),
        operator: 'Operador m√≥vil',
        source: 'scanner',
      };

      appendCheckIn(record);
      setStatus({ type: 'success', message: `${invitee.name} autorizado. Rol: ${invitee.role === 'student' ? 'Estudiante' : 'Invitado'}` });

      try {
        const appCheckToken = await getAppCheckToken();
        const response = await fetch('/api/checkins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(appCheckToken ? { 'X-App-Check': appCheckToken } : {}),
          },
          body: JSON.stringify(record),
        });

        if (!response.ok) {
          await queueCheckIn({
            ceremonyId: record.ceremonyId,
            inviteeId: record.inviteeId,
            ticketCode: record.ticketCode,
            scannedAt: record.scannedAt,
            source: 'scanner',
          });
          setStatus({ type: 'info', message: `${invitee.name} en cola offline. Se sincronizar·.° autom√°ticamente.` });
        }
      } catch (error) {
        console.error('Error enviando check-in', error);
        await queueCheckIn({
          ceremonyId: record.ceremonyId,
          inviteeId: record.inviteeId,
          ticketCode: record.ticketCode,
          scannedAt: record.scannedAt,
          source: 'scanner',
        });
        setStatus({ type: 'info', message: `${invitee.name} en cola offline. Se sincronizar·.°.` });
      }
    },
    [invitees, alreadyCheckedIds, appendCheckIn],
  );

  const startScanner = useCallback(async () => {
    if (!videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus({ type: 'error', message: 'El navegador no soporta captura de c·mara.' });
        return;
      }

      const provisionalStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      provisionalStream.getTracks().forEach((track) => track.stop());

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const preferredDevice =
        devices.find((device) => device.label.toLowerCase().includes('back')) ?? devices[0];
      if (!preferredDevice?.deviceId) {
        setStatus({ type: 'error', message: 'No se encontrÛ c·mara disponible.' });
        return;
      }

      await reader.decodeFromVideoDevice(preferredDevice.deviceId, videoRef.current, (result, error) => {
        if (result) {
          const value = result.getText();
          setTimeout(() => void handleResult(value), 0);
        }
        if (error && error.name !== 'NotFoundException') {
          console.debug('Scanner error', error);
        }
      });
      setStatus({ type: 'info', message: 'Esc·ner listo. Apunta al QR.' });
      setScannerActive(true);
    } catch (error) {
      console.error('Scanner error', error);
      setStatus({ type: 'error', message: 'No se pudo iniciar la c·mara. Verifica permisos.' });
    }
  }, [handleResult]);
  const stopScanner = useCallback(async () => {
    const reader = readerRef.current;
    if (reader) {
      const resetFn = (reader as unknown as { reset?: () => void | Promise<void> }).reset;
      if (typeof resetFn === 'function') {
        await Promise.resolve(resetFn.call(reader));
      }
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScannerActive(false);
  }, []);

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, [stopScanner]);

  const filteredInvitees = filterInvitees(invitees, query).slice(0, 6);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Control de acceso</h2>
          <p className="text-sm text-slate-300">Escanea QR en tiempo real o busca manualmente por nombre, documento o c√≥digo.</p>
        </div>
        <button
          onClick={scannerActive ? () => stopScanner() : () => void startScanner()}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
            scannerActive
              ? 'border border-rose-500/60 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30'
              : 'border border-emerald-500/60 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
          }`}
        >
          {scannerActive ? <RefreshCw className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {scannerActive ? 'Detener' : 'Activar esc√°ner'}
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
            <video ref={videoRef} className="aspect-video w-full bg-black object-cover" muted autoPlay playsInline />
          </div>
          {status ? (
            <div
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                status.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-200'
                  : status.type === 'error'
                    ? 'bg-rose-500/15 text-rose-200'
                    : 'bg-slate-800/80 text-slate-200'
              }`}
            >
              {status.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : status.type === 'error' ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <RefreshCw className="h-4 w-4 animate-spin" />
              )}
              <span>{status.message}</span>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">B√∫squeda manual</label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nombre, c√≥digo, documento..."
                className="h-10 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <ul className="mt-3 space-y-2">
              {filteredInvitees.map((invitee) => {
                const checked = alreadyCheckedIds.has(invitee.id);
                return (
                  <li
                    key={invitee.id}
                    className={`rounded-xl border px-3 py-2 text-sm ${
                      checked
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                        : 'border-slate-800 bg-slate-950/60 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-white">{invitee.name}</p>
                        <p className="text-xs text-slate-400">{invitee.ticketCode}</p>
                      </div>
                      <button
                        onClick={() => void handleResult(invitee.ticketCode)}
                        className="text-xs font-semibold text-emerald-300 hover:text-emerald-100"
                      >
                        Marcar ingreso
                      </button>
                    </div>
                  </li>
                );
              })}
              {!filteredInvitees.length && query && (
                <li className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-xs text-slate-400">
                  No se encontraron coincidencias para &quot;{query}&quot;.
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
            <p><span className="font-semibold text-white">Ceremonia:</span> {ceremony?.name ?? 'Sin definir'}</p>
            <p><span className="font-semibold text-white">Ingresos totales:</span> {checkIns.length}</p>
            <p>
              <span className="font-semibold text-white">Pendientes:</span> {Math.max(invitees.length - checkIns.length, 0)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};



