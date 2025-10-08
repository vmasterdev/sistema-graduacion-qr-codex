'use client';

import { useMemo } from 'react';
import { BarChart3, IdCard, Users } from 'lucide-react';
import { useDashboardStore } from '@/hooks/use-dashboard-store';

export const StatsOverview = () => {
  const invitees = useDashboardStore((state) => state.invitees);
  const students = useDashboardStore((state) => state.students);
  const checkIns = useDashboardStore((state) => state.checkIns);

  const counts = useMemo(() => {
    const totalGuests = invitees.filter((invitee) => invitee.role === 'guest').length;
    const totalStudents = students.length;
    const totalInvitees = invitees.length;
    const attendance = totalInvitees ? Math.round((checkIns.length / totalInvitees) * 100) : 0;
    return { totalGuests, totalStudents, totalInvitees, attendance };
  }, [invitees, students, checkIns.length]);

  const cards = [
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Estudiantes importados',
      value: counts.totalStudents,
      accent: 'text-emerald-300',
    },
    {
      icon: <IdCard className="h-6 w-6" />,
      title: 'Tickets generados',
      value: counts.totalInvitees,
      accent: 'text-sky-300',
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: 'Asistencia',
      value: `${counts.attendance}%`,
      accent: 'text-amber-300',
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <article
          key={card.title}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-sm text-slate-300"
        >
          <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 ${card.accent}`}>
            {card.icon}
          </div>
          <p className="text-xs uppercase tracking-wide text-slate-400">{card.title}</p>
          <p className="mt-2 text-3xl font-semibold text-white">{card.value}</p>
        </article>
      ))}
    </section>
  );
};
