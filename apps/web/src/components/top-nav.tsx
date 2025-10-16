'use client';

import Link from 'next/link';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/control-acceso', label: 'Control de acceso' },
  { href: '/importar-ceremonias', label: 'Importar ceremonias' },
];

export const TopNav = () => {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
        <Link href="/dashboard" className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-300">
          Sistema QR
        </Link>
        <nav className="flex items-center gap-1 text-xs font-semibold text-slate-300">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-2 transition hover:bg-emerald-500/15 hover:text-emerald-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};
