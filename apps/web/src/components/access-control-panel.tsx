'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { Exception, Result } from '@zxing/library';
import { Camera, CheckCircle2, RefreshCw, Search, XCircle } from 'lucide-react';
import { queueCheckIn } from '@/lib/offlineQueue';
import { useDashboardStore } from '@/hooks/use-dashboard-store';
import type { AccessLog, Invitee, Student } from '@/types';

interface ScannerStatus {
  type: 'success' | 'error' | 'info';
  message: string;
}

const filterStudents = (students: Student[], query: string) => {
  const normalised = query.trim().toLowerCase();
  if (!normalised) return [];

  return students.filter((student) => {
    if (
      student.idEstudiante.toLowerCase().includes(normalised) ||
      student.nombreCompleto.toLowerCase().includes(normalised) ||
      student.programa.toLowerCase().includes(normalised) ||
      student.numeroDocumento.toLowerCase().includes(normalised) ||
      student.municipio.toLowerCase().includes(normalised) ||
      student.fechaCeremonia.toLowerCase().includes(normalised)
    ) {
      return true;
    }

    return student.invitees.some((invitee) => {
      return (
        invitee.name.toLowerCase().includes(normalised) ||
        (invitee.documentNumber ?? '').toLowerCase().includes(normalised)
      );
    });
  });
};

const filterInviteesByCeremony = (invitees: Invitee[], ceremonyId?: string) => {
  if (!ceremonyId) return invitees;
  return invitees.filter((invitee) => invitee.ceremonyId === ceremonyId);
};

const filterStudentsByCeremony = (students: Student[], ceremonyId?: string) => {
  if (!ceremonyId) return students;
  return students.filter((student) => student.idCeremonia === ceremonyId);
};

export const AccessControlPanel = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [status, setStatus] = useState<ScannerStatus>();
  const [query, setQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>();
  const [highlightInviteeId, setHighlightInviteeId] = useState<string>();

  const invitees = useDashboardStore((state) => state.invitees);
  const students = useDashboardStore((state) => state.students);
  const ceremonies = useDashboardStore((state) => state.ceremonies);
  const selectedCeremonyId = useDashboardStore((state) => state.selectedCeremonyId);
  const appendCheckIn = useDashboardStore((state) => state.appendCheckIn);
  const setCheckIns = useDashboardStore((state) => state.setCheckIns);
  const refreshCeremonyData = useDashboardStore((state) => state.refreshCeremonyData);
  const checkIns = useDashboardStore((state) => state.checkIns);

  const ceremony = useMemo(
    () => ceremonies.find((item) => item.id === selectedCeremonyId),
    [ceremonies, selectedCeremonyId],
  );

  const inviteesForCeremony = useMemo(
    () => filterInviteesByCeremony(invitees, selectedCeremonyId),
    [invitees, selectedCeremonyId],
  );

  const studentsForCeremony = useMemo(
    () => filterStudentsByCeremony(students, selectedCeremonyId),
    [students, selectedCeremonyId],
  );

  const selectedStudent = useMemo(
    () => students.find((item) => item.idEstudiante === selectedStudentId),
    [students, selectedStudentId],
  );

  const checkInsForCeremony = useMemo(() => checkIns.filter((log) => log.ceremonyId === selectedCeremonyId), [checkIns, selectedCeremonyId]);
  const alreadyCheckedIds = useMemo(
    () => new Set(checkInsForCeremony.map((log) => log.inviteeId)),
    [checkInsForCeremony],
  );

  const filteredStudents = useMemo(
    () => filterStudents(studentsForCeremony, query).slice(0, 6),
    [studentsForCeremony, query],
  );

  useEffect(() => {
    if (!selectedCeremonyId) {
      return;
    }

    const controller = new AbortController();

    const loadCheckIns = async () => {
      try {
        await refreshCeremonyData(selectedCeremonyId);

        const response = await fetch(`/api/checkins?ceremonyId=${encodeURIComponent(selectedCeremonyId)}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          console.error('No se pudieron obtener check-ins', response.status);
          return;
        }

        const payload = (await response.json()) as {
          ok?: boolean;
          items?: Array<{
            id: string;
            inviteeId: string;
            ceremonyId: string;
            ticketCode: string;
            scannedAt: string;
            source: 'scanner' | 'manual';
            operator?: string | null;
          }>;
        };

        if (payload?.ok && Array.isArray(payload.items)) {
          setCheckIns(
            payload.items.map<AccessLog>((item) => ({
              id: item.id,
              inviteeId: item.inviteeId,
              ceremonyId: item.ceremonyId,
              ticketCode: item.ticketCode,
              scannedAt: item.scannedAt,
              source: item.source,
              operator: item.operator ?? 'Sistema',
            })),
          );
        }
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') {
          return;
        }
        console.error('Error cargando check-ins', error);
      }
    };

    void loadCheckIns();

    return () => {
      controller.abort();
    };
  }, [refreshCeremonyData, selectedCeremonyId, setCheckIns]);

  const processInvitee = useCallback(
    async (invitee: Invitee) => {
      setSelectedStudentId(invitee.idEstudiante);
      setHighlightInviteeId(invitee.id);

      if (alreadyCheckedIds.has(invitee.id)) {
        setStatus({ type: 'error', message: `${invitee.name} ya registró ingreso.` });
        return;
      }

      const record: AccessLog = {
        id: crypto.randomUUID(),
        inviteeId: invitee.id,
        ticketCode: invitee.ticketCode,
        ceremonyId: invitee.ceremonyId,
        scannedAt: new Date().toISOString(),
        operator: 'Operador móvil',
        source: 'scanner',
      };

      appendCheckIn(record);
      setStatus({
        type: 'success',
        message: `${invitee.name} autorizado. Rol: ${invitee.role === 'student' ? 'Estudiante' : 'Invitado'}`,
      });

      const enqueueOffline = async () => {
        await queueCheckIn({
          ceremonyId: record.ceremonyId,
          inviteeId: record.inviteeId,
          ticketCode: record.ticketCode,
          scannedAt: record.scannedAt,
          source: 'scanner',
        });
        setStatus({
          type: 'info',
          message: `${invitee.name} en cola offline. Se sincronizará automáticamente.`,
        });
      };

      try {
        const response = await fetch('/api/checkins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(record),
        });

        if (!response.ok) {
          console.error('Respuesta no exitosa al registrar check-in', response.status);
          await enqueueOffline();
          return;
        }

        const payload = (await response.json()) as { ok?: boolean };
        if (!payload?.ok) {
          console.error('Respuesta inválida al registrar check-in', payload);
          await enqueueOffline();
        }
      } catch (error) {
        console.error('Error enviando check-in', error);
        await enqueueOffline();
      }
    },
    [alreadyCheckedIds, appendCheckIn],
  );

  const handleResult = useCallback(
    async (ticketCode: string) => {
      const invitee = invitees.find((item) => item.ticketCode === ticketCode);
      if (!invitee) {
        setStatus({ type: 'error', message: `Ticket ${ticketCode} no pertenece a esta ceremonia.` });
        return;
      }

      await processInvitee(invitee);
    },
    [invitees, processInvitee],
  );

  const startScanner = useCallback(async () => {
    if (!videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus({ type: 'error', message: 'El navegador no soporta captura de cámara.' });
        return;
      }

      const scanCallback = (result: Result | undefined, error: Exception | undefined) => {
        if (result) {
          const value = result.getText();
          setTimeout(() => void handleResult(value), 0);
        }
        if (error && error.name !== 'NotFoundException') {
          console.debug('Scanner error', error);
        }
      };

      const provisionalStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
      });
      provisionalStream.getTracks().forEach((track) => track.stop());

      const isMobileDevice = /android|iphone|ipad|ipod|windows phone/i.test(navigator.userAgent ?? '');
      let hasStarted = false;

      if (isMobileDevice) {
        try {
          await reader.decodeFromConstraints(
            {
              audio: false,
              video: {
                facingMode: { ideal: 'environment' },
              },
            },
            videoRef.current,
            scanCallback,
          );
          hasStarted = true;
        } catch (constraintError) {
          console.warn('Fallo al inicializar cámara trasera, usando fallback', constraintError);
        }
      }

      if (!hasStarted) {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const preferredDevice =
          devices.find((device) => /back|rear|environment/i.test(device.label)) ?? devices[0];
        if (!preferredDevice?.deviceId) {
          setStatus({ type: 'error', message: 'No se encontró cámara disponible.' });
          return;
        }

        await reader.decodeFromVideoDevice(preferredDevice.deviceId, videoRef.current, scanCallback);
      }

      setStatus({ type: 'info', message: 'Escáner listo. Apunta al QR.' });
      setScannerActive(true);
    } catch (error) {
      console.error('Scanner error', error);
      setStatus({ type: 'error', message: 'No se pudo iniciar la cámara. Verifica permisos.' });
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

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Control de acceso</h2>
          <p className="text-sm text-slate-300">
            Escanea códigos QR en tiempo real o ubica asistentes por nombre, documento, programa o municipio.
          </p>
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
          {scannerActive ? 'Detener' : 'Activar escáner'}
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
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Búsqueda manual (ID, estudiante, invitado, programa o municipio)
            </label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setHighlightInviteeId(undefined);
                }}
                placeholder="Nombre, código, documento, programa o municipio"
                className="h-10 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <ul className="mt-3 space-y-2">
              {filteredStudents.map((student) => (
                <li
                  key={student.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-sm text-slate-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{student.nombreCompleto}</p>
                      <p className="text-xs text-slate-400">
                        {student.idEstudiante} · {student.programa || 'Programa sin registrar'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {student.fechaCeremonia} · {student.municipio || 'Municipio sin registrar'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedStudentId(student.idEstudiante);
                        setHighlightInviteeId(undefined);
                      }}
                      className="text-xs font-semibold text-emerald-300 hover:text-emerald-100"
                    >
                      Ver invitados
                    </button>
                  </div>
                </li>
              ))}
              {!filteredStudents.length && query && (
                <li className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-xs text-slate-400">
                  No se encontraron coincidencias para “{query}”.
                </li>
              )}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-200">
            {selectedStudent ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Resumen del estudiante</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">{selectedStudent.nombreCompleto}</h3>
                  <p className="text-xs text-slate-400">
                    ID {selectedStudent.idEstudiante} · Programa {selectedStudent.programa || 'N/D'} · Documento {selectedStudent.numeroDocumento}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedStudent.fechaCeremonia} · {selectedStudent.municipio || 'Municipio sin registrar'}
                  </p>
                </div>
                <ul className="space-y-2">
                  {selectedStudent.invitees.map((invitee) => {
                    const checked = alreadyCheckedIds.has(invitee.id);
                    const isHighlighted = invitee.id === highlightInviteeId;
                    return (
                      <li
                        key={invitee.id}
                        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${
                          checked
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                            : 'border-slate-800 bg-slate-950/60 text-slate-200'
                        } ${isHighlighted ? 'ring-2 ring-emerald-400/80' : ''}`}
                      >
                        <div>
                          <p className="font-medium text-white">{invitee.name}</p>
                          <p className="text-xs text-slate-400">
                            {invitee.role === 'student' ? 'Estudiante' : 'Invitado'} · {invitee.ticketCode}
                          </p>
                        </div>
                        <button
                          onClick={() => void processInvitee(invitee)}
                          disabled={checked}
                          className={`text-xs font-semibold transition ${
                            checked
                              ? 'cursor-not-allowed text-emerald-300/70'
                              : 'text-emerald-300 hover:text-emerald-100'
                          }`}
                        >
                          {checked ? 'Registrado' : 'Marcar ingreso'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                Usa el escáner o la búsqueda para seleccionar un estudiante y registrar a sus invitados.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
            <p>
              <span className="font-semibold text-white">Ceremonia:</span> {ceremony?.name ?? 'Sin definir'}
            </p>
            <p>
              <span className="font-semibold text-white">Ingresos totales:</span> {checkInsForCeremony.length}
            </p>
            <p>
              <span className="font-semibold text-white">Pendientes:</span> {Math.max(inviteesForCeremony.length - checkInsForCeremony.length, 0)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
