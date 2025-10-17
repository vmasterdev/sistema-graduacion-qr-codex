# Supabase

Esta carpeta contiene los recursos necesarios para migrar la aplicación desde Firebase
hasta Supabase. Sigue los pasos en orden para levantar la infraestructura antes de
ejecutar el frontend.

## 1. Crear proyecto en Supabase

1. Inicia sesión en https://app.supabase.com y crea un nuevo proyecto.
2. Elige la región más cercana y una contraseña fuerte para la base de datos.
3. Una vez aprovisionado, entra al panel y copia:
   - **Project URL** (Settings → API → `Project URL`)
   - **anon public key** (Settings → API → `anon key`)
   - **service_role key** (Settings → API → `service_role`)

> Nunca expongas el `service_role` en el navegador. Úsalo únicamente en el backend.

## 2. Configurar variables de entorno

1. Copia el archivo `apps/web/.env.local` si todavía no existe y completa:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=<Project URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
   SUPABASE_SERVICE_ROLE_KEY=<service_role>
   ```

2. Para entornos de producción, configura las variables en la plataforma donde despliegues
   (Vercel, Supabase Functions, etc.).

## 3. Crear el esquema inicial

Ejecuta las migraciones ubicadas en `supabase/migrations` usando el editor de consultas del
panel de Supabase o `supabase CLI`:

```bash
supabase db query supabase/migrations/0001_init.sql
supabase db query supabase/migrations/0002_checkins.sql
supabase db query supabase/migrations/0003_students_invitees.sql
```

Esto crea tablas y políticas para ceremonias, perfiles administrativos, estudiantes, invitados y check-ins.

## 4. Configurar bucket de Storage

1. Ve a **Storage → Buckets** y crea uno nuevo (por ejemplo `tickets`).
2. Marca el bucket como **Public** para permitir descargas directas o ajusta las políticas
   según tus necesidades.
3. Copia el nombre en `SUPABASE_TICKETS_BUCKET` dentro de `apps/web/.env.local` si difiere del
   valor por defecto (`tickets`).

## 5. Usuarios administrativos

- Usa la sección **Authentication → Users** para crear las cuentas que podrán importar
  ceremonias y operar el dashboard.
- El formulario existente en la app utiliza email y contraseña (aunque en la UI siga
  figurando "usuario" puedes introducir el email registrado).

## 6. Próximos pasos de migración

Los siguientes módulos se migrarán gradualmente:

- Importación de ceremonias (CSV y manual) → Supabase
- Importación de estudiantes e invitados
- Check-ins en tiempo real con sincronización offline
- Reportes y descargas

Cada paso añadirá nuevas migraciones en `supabase/migrations` y adaptará la UI. Sigue las
notas de cada commit o revisa este README para instrucciones adicionales.
