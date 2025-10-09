import Link from 'next/link';
import { CeremonySelector } from '@/components/ceremony-selector';
import { StatsOverview } from '@/components/stats-overview';
import { CsvUploader } from '@/components/csv-uploader';
import { TemplateDesigner } from '@/components/template-designer';
import { TicketDownloads } from '@/components/ticket-downloads';
import { AccessControlPanel } from '@/components/access-control-panel';
import { ReportsPanel } from '@/components/reports-panel';

export default function DashboardPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 pb-24 pt-8 md:px-8">
      <section className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-8 text-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-emerald-300">Ceremonias seguras</p>
            <h1 className="text-3xl font-semibold text-white md:text-4xl">
              Gestión integral de ingresos con tarjetas QR para graduaciones
            </h1>
            <p className="max-w-2xl text-sm text-slate-300">
              Diseña tarjetas personalizadas, genera QR únicos, controla accesos desde el móvil y sincroniza la asistencia en
              tiempo real incluso sin conexión.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href="/control-acceso"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
              >
                Ir a control de acceso
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-sm text-emerald-100">
            <p className="text-xs uppercase tracking-wide text-emerald-300">Rendimiento garantizado</p>
            <p className="mt-2 text-lg font-semibold text-white">
              Escaneo <span className="font-mono text-emerald-200">&lt;150&nbsp;ms</span>
            </p>
            <p className="text-xs text-emerald-200/80">Motor ZXing + caché offline + sincronización automática.</p>
          </div>
        </div>
      </section>

      <CeremonySelector />
      <StatsOverview />

      <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <CsvUploader />
        <TemplateDesigner />
      </div>

      <TicketDownloads />
      <AccessControlPanel />
      <ReportsPanel />
    </main>
  );
}
