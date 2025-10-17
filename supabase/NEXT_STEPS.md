# Plan de migración restante

La importación de ceremonias ya apunta a Supabase. Los siguientes módulos se migrarán en
orden sugerido:

1. ✅ **Check-ins en tiempo real**
   - Tabla `checkins` creada (`supabase/migrations/0002_checkins.sql`) con políticas RLS.
   - Endpoint `/api/checkins` en Next.js usa el `SUPABASE_SERVICE_ROLE_KEY` para lectura/escritura.
   - El flujo de escaneo y la cola offline ahora envían datos a Supabase.
   - **Pendiente:** modelar `invitees` y sus relaciones en Supabase para que las búsquedas no dependan del estado local.

2. ✅ **Importación de estudiantes e invitados**
   - Tablas `students` e `invitees` con RLS (ver `supabase/migrations/0003_students_invitees.sql`).
   - Endpoint `/api/students/import` gestiona cargas CSV generando códigos estables y actualizando invitados.
   - `ingestCsvRows` ahora delega en Supabase y refresca el estado del dashboard con los datos persistidos.
   - **Pendiente:** exponer vistas agregadas para reportes y optimizar la generación de QR (actualmente se hace bajo demanda en cliente).

3. ✅ **Tickets en Supabase Storage (parcial)**
   - Endpoint `/api/tickets/upload` usa la service key para subir imágenes PNG al bucket `tickets`.
   - `TicketDownloads` sube cada render al storage mientras mantiene la descarga local inmediata.
   - **Pendiente:** evitar renders duplicados leyendo desde Storage al preparar lotes y mover generación de PDFs/ZIP a un worker o función edge.

4. ✅ **Reportes y paneles**
   - Endpoint `/api/reports/ceremony` genera CSV/PDF usando la service key y datos en Supabase.
   - `ReportsPanel` descarga los archivos desde el backend, manteniendo los indicadores locales.
   - **Pendiente:** Considerar exponer vistas materializadas en Supabase si los volúmenes crecen.

5. **Limpieza final**
   - Verificar el comportamiento offline y el service worker.
   - Evaluar mover tareas pesadas (ZIP/PDF de tarjetas) a un worker o Edge Function.

Cada paso deberá añadir migraciones SQL en `supabase/migrations` y pruebas manuales
documentadas. Mantén el archivo actualizado conforme avances.
