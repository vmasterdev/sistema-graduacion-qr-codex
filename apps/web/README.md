# Frontend (apps/web)

Aplicación Next.js (App Router) con TailwindCSS, React Query y Supabase.

## Scripts
- `npm run dev` — servidor de desarrollo (http://localhost:3000).
- `npm run build` — build de producción (Next.js).
- `npm run export` — genera salida estática (para Firebase Hosting).
- `npm run lint` — ESLint.
- `npm run test:e2e` — pruebas end-to-end (Playwright).

> Antes de correr Playwright ejecuta `npx playwright install --with-deps` una sola vez.

## Rutas clave
- `src/app/(dashboard)/dashboard/page.tsx` — dashboard completo.
- `src/components/` — módulos UI (CSV uploader, diseñador, descargas, control de acceso, reportes, providers).
- `src/lib/` — Integraciones con Supabase (clientes, storage), parsing CSV, tickets, renderer de plantillas, cola offline IndexedDB.
- `src/pages/api/*` — endpoints Next.js que operan sobre Supabase (`/checkins`, `/students/import`, `/reports/ceremony`, `/tickets/upload`).
- `public/sw.js` — service worker (cache-first + sync offline).
- `tests/e2e` — escenario Playwright que valida flujo mobile y fallback offline.

Variables de entorno requeridas en `.env.local` se describen en `supabase/README.md` (incluye `SUPABASE_TICKETS_BUCKET` para el Storage). El proyecto ya no
requiere Firebase ni PocketBase.
