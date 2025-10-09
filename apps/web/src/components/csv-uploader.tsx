'use client';

import { useRef, useState } from 'react';
import { FileDown, Loader2, UploadCloud } from 'lucide-react';
import { parseStudentsCsv } from '@/lib/csv';
import { useDashboardStore } from '@/hooks/use-dashboard-store';

const templateHeaders = [
  'studentId',
  'fullName',
  'documentNumber',
  'programName',
  'ceremonyId',
  'guestOneName',
  'guestOneDocument',
  'guestTwoName',
  'guestTwoDocument',
] as const;

const buildCsvTemplate = () => {
  const headerRow = `${templateHeaders.join(',')}`;
  return `${headerRow}\n`;
};

export const CsvUploader = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const ingestCsvRows = useDashboardStore((state) => state.ingestCsvRows);
  const isProcessing = useDashboardStore((state) => state.isProcessingCsv);
  const importError = useDashboardStore((state) => state.importError);
  const setImportError = useDashboardStore((state) => state.setImportError);
  const [successMessage, setSuccessMessage] = useState<string | undefined>();

  const handleDownloadTemplate = () => {
    const csv = buildCsvTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_carga_estudiantes.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSuccessMessage(undefined);
    setImportError(undefined);

    try {
      const rows = await parseStudentsCsv(file);
      await ingestCsvRows(rows);
      setSuccessMessage(`Importados ${rows.length} estudiantes con invitados`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo procesar el CSV';
      setImportError(message);
    } finally {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg backdrop-blur">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Carga masiva de estudiantes</h2>
          <p className="mt-1 text-sm text-slate-300">
            Sube el archivo CSV con estudiantes, programa académico y hasta 2 invitados por fila. Generaremos códigos QR únicos automáticamente.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-emerald-500 hover:text-emerald-200"
          >
            <FileDown className="h-5 w-5" /> Descargar plantilla
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20"
          >
            <UploadCloud className="h-5 w-5" /> Seleccionar CSV
          </button>
        </div>
      </header>

      <input
        type="file"
        accept="text/csv,application/vnd.ms-excel"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="mt-6 space-y-4 text-sm text-slate-300">
        <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4">
          Formato esperado de columnas: <code className="font-mono text-emerald-300">{templateHeaders.join(', ')}</code>
        </p>
        <ul className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
          <li>- Máximo dos invitados por estudiante.</li>
          <li>- Incluye el identificador exacto de la ceremonia.</li>
          <li>- Programa académico requerido para cada estudiante.</li>
          <li>- Los QR se generan y guardan automáticamente.</li>
        </ul>
      </div>

      <footer className="mt-4 flex items-center gap-3 text-sm">
        {isProcessing && (
          <p className="flex items-center gap-2 text-amber-200">
            <Loader2 className="h-4 w-4 animate-spin" /> Procesando CSV...
          </p>
        )}
        {!isProcessing && successMessage && <p className="text-emerald-300">{successMessage}</p>}
        {!isProcessing && importError && <p className="text-rose-400">{importError}</p>}
      </footer>
    </section>
  );
};
