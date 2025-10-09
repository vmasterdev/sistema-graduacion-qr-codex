'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { CABECERA_CEREMONIAS, CeremoniaCsvRow } from '@/types/ceremonia-import';
import { parsearCsvCeremoniasProtegidas } from '@/lib/csv-ceremonias';

const mensajeEncabezado = CABECERA_CEREMONIAS.join(', ');

const crearPayload = (registros: CeremoniaCsvRow[]) => JSON.stringify({ ceremonias: registros });

export default function ImportarCeremoniasPage() {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estaProcesando, setEstaProcesando] = useState(false);
  const [mensaje, setMensaje] = useState<string>();
  const [esError, setEsError] = useState(false);

  const puedeEnviar = useMemo(
    () => Boolean(usuario && contrasena && archivo && !estaProcesando),
    [usuario, contrasena, archivo, estaProcesando],
  );

  const manejarDescargaPlantilla = () => {
    const encabezado = CABECERA_CEREMONIAS.join(',') + '\n';
    const blob = new Blob([encabezado], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'plantilla_ceremonias.csv';
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  };

  const manejarArchivo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setArchivo(file);
    setMensaje(undefined);
  };

  const manejarEnvio = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!archivo) return;

    setEstaProcesando(true);
    setMensaje(undefined);
    setEsError(false);

    try {
      const registros = await parsearCsvCeremoniasProtegidas(archivo);
      if (!registros.length) {
        throw new Error('El archivo no contiene filas validas.');
      }

      const respuesta = await fetch('/api/admin/import-ceremonias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${btoa(`${usuario}:${contrasena}`)}`,
        },
        body: crearPayload(registros),
      });

      if (!respuesta.ok) {
        const texto = await respuesta.text();
        throw new Error(texto || 'No fue posible importar las ceremonias.');
      }

      setMensaje(`Ceremonias importadas correctamente: ${registros.length}`);
      setArchivo(null);
    } catch (error) {
      setEsError(true);
      setMensaje(error instanceof Error ? error.message : 'Se produjo un error inesperado.');
    } finally {
      setEstaProcesando(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 pb-24 pt-12 md:px-8">
      <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8 text-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-emerald-300">Administrador de ceremonias</p>
            <h1 className="text-3xl font-semibold text-white md:text-4xl">Importar ceremonias protegidas</h1>
            <p className="text-sm text-slate-300">Carga masiva de ceremonias (fecha y sede) protegida por usuario y contraseña. Solo personal autorizado debe utilizar este módulo.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm text-slate-300">
            <Lock className="h-5 w-5 text-emerald-300" />
            <span>Acceso restringido</span>
          </div>
        </div>
      </section>

      <form onSubmit={manejarEnvio} className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="usuario" className="text-xs font-semibold uppercase tracking-wide text-slate-400">Usuario</label>
            <input
              id="usuario"
              value={usuario}
              onChange={(event) => setUsuario(event.target.value)}
              required
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              placeholder="admin"
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="contrasena" className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contraseña</label>
            <input
              id="contrasena"
              value={contrasena}
              onChange={(event) => setContrasena(event.target.value)}
              required
              type="password"
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
              placeholder="******"
              autoComplete="current-password"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Archivo CSV</label>
          <input
            type="file"
            accept="text/csv"
            onChange={manejarArchivo}
            className="w-full cursor-pointer rounded-xl border border-dashed border-slate-700 bg-slate-950/60 px-3 py-4 text-sm text-slate-300 focus:border-emerald-400 focus:outline-none"
          />
          <p className="text-xs text-slate-500">Columnas requeridas: {mensajeEncabezado}.</p>
        </div>

        {mensaje && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${esError ? 'border-rose-500/60 bg-rose-500/15 text-rose-200' : 'border-emerald-500/60 bg-emerald-500/15 text-emerald-200'}`}
          >
            {mensaje}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={manejarDescargaPlantilla}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-500 hover:text-emerald-200"
          >
            Descargar plantilla CSV
          </button>
          <button
            type="submit"
            disabled={!puedeEnviar}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/60 bg-emerald-500/10 px-5 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {estaProcesando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Importar ceremonias
          </button>
        </div>
      </form>
    </main>
  );
}
