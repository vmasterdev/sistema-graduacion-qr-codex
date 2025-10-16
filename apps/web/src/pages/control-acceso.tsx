'use client';

import { AccessControlPanel } from '@/components/access-control-panel';

export default function ControlAccesoPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 pb-20 pt-8 md:px-8">
      <AccessControlPanel />
    </main>
  );
}
