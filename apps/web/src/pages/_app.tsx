'use client';

import type { AppProps } from 'next/app';
import { Geist, Geist_Mono } from 'next/font/google';
import '@/app/globals.css';
import { AppProviders } from '@/app/providers';
import { ServiceWorkerInitializer } from '@/components/service-worker-initializer';
import { TopNav } from '@/components/top-nav';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <div className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-slate-950 text-slate-100`}>
      <AppProviders>
        <ServiceWorkerInitializer />
        <TopNav />
        <Component {...pageProps} />
      </AppProviders>
    </div>
  );
}
