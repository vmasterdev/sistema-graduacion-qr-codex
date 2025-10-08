import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AppProviders } from './providers';
import { ServiceWorkerInitializer } from '@/components/service-worker-initializer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Sistema de Graduación QR',
  description:
    'Gestión integral y mobile-first para generar tarjetas con QR, controlar accesos y monitorear ingresos en ceremonias de grado.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <AppProviders>
          <ServiceWorkerInitializer />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
