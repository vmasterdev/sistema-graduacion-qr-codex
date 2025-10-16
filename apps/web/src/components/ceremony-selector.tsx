'use client';

import { useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import { useDashboardStore } from '@/hooks/use-dashboard-store';
import type { Ceremony } from '@/types';

const fallbackCeremonies: Ceremony[] = [
  {
    id: 'ceremony-2025-01',
    name: 'Graduación Ingeniería 2025',
    venue: 'Auditorio Principal',
    scheduledAt: new Date().toISOString(),
    timezone: 'America/Bogota',
  },
  {
    id: 'ceremony-2025-02',
    name: 'Maestrías Ejecutivas 2025',
    venue: 'Centro de Convenciones',
    scheduledAt: new Date().toISOString(),
    timezone: 'America/Bogota',
  },
];

export const CeremonySelector = () => {
  const ceremonies = useDashboardStore((state) => state.ceremonies);
  const selected = useDashboardStore((state) => state.selectedCeremonyId);
  const setCeremonies = useDashboardStore((state) => state.setCeremonies);
  const selectCeremony = useDashboardStore((state) => state.selectCeremony);

  useEffect(() => {
    if (!ceremonies.length) {
      setCeremonies(fallbackCeremonies);
    }
  }, [ceremonies.length, setCeremonies]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    selectCeremony(event.target.value);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
          <CalendarDays className="h-6 w-6" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Ceremonia activa</p>
          <h2 className="text-lg font-semibold text-white">Selecciona la ceremonia</h2>
        </div>
      </div>

      <div className="mt-4">
        <select
          value={selected}
          onChange={handleChange}
          className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-white focus:border-emerald-400 focus:outline-none"
        >
          <option value="" disabled>
            Selecciona una ceremonia
          </option>
          {ceremonies.map((ceremony) => (
            <option key={ceremony.id} value={ceremony.id} className="bg-slate-900 text-white">
              {ceremony.name} · {ceremony.venue}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
