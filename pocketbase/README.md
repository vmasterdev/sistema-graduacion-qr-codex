# PocketBase en Docker

Este proyecto incluye una configuración lista para ejecutar PocketBase en contenedores
Docker, compartiendo un único binario para múltiples proyectos y manteniendo los datos
aislados por carpeta.

## Requisitos

- Docker y Docker Compose v2
- Puerto local libre (por defecto `8090`)

## Estructura

- `docker-compose.yml`: definición del servicio PocketBase.
- `Dockerfile`: construye una imagen ligera basada en Alpine descargando la versión oficial de
  PocketBase desde GitHub.
- `.env.example`: variables para personalizar el puerto (`POCKETBASE_PORT`), la versión
  (`POCKETBASE_VERSION`) y el paquete descargado (`POCKETBASE_ARCHIVE`, por defecto `linux_amd64`).
  Copia este archivo a `.env` cuando quieras sobreescribir valores.
- `pb_data`, `pb_public`, `pb_migrations`: carpetas montadas como volúmenes persistentes.

## Puesta en marcha

1. (Opcional) Copia `.env.example` a `.env` y ajusta los valores que necesites.
2. Desde `pocketbase/` levanta el contenedor:

   ```bash
   docker compose up -d
   ```

   Esto construye una imagen usando el Dockerfile del directorio (descargando el binario oficial
   según la versión indicada) y expone el panel en
   `http://127.0.0.1:8090/_/`.

3. La primera vez se te pedirá crear el usuario administrador. Usa ese panel para definir:
   - Colección de autenticación (por ejemplo `users`), con los usuarios permitidos para cargar
     ceremonias.
   - Colección `ceremonias` con los campos `id_ceremonia`, `nombre_ceremonia`, `fecha_ceremonia`,
     `lugar_ceremonia`, `descripcion`, `creado_en`, `actualizado_en`.

4. Mantén el contenedor corriendo mientras desarrollas. Para detenerlo:

   ```bash
   docker compose down
   ```

## Integración con el frontend

Asegúrate de que el archivo `apps/web/.env.local` tenga la URL pública del servicio:

```env
NEXT_PUBLIC_POCKETBASE_URL=http://127.0.0.1:8090
NEXT_PUBLIC_POCKETBASE_AUTH_COLLECTION=users
NEXT_PUBLIC_POCKETBASE_CEREMONIES_COLLECTION=ceremonias
```

El flujo de importación de ceremonias usará PocketBase automáticamente cuando esta variable esté
definida; de lo contrario recurrirá a las Cloud Functions existentes.

## Compartir el mismo PocketBase entre proyectos

- Mantén este directorio `pocketbase/` fuera de los repositorios que no lo necesiten o crea un
  repositorio independiente con la misma estructura para reutilizarlo.
- Cada proyecto puede apuntar a la misma URL si deseas compartir datos o usar copias separadas
  arrancando el servicio con un nombre de contenedor distinto y un puerto diferente:

  ```bash
  POCKETBASE_PORT=8091 docker compose --project-name pocketbase-proyectoB up -d
  ```

## Actualizaciones

- Cambia `POCKETBASE_VERSION` cuando quieras probar una versión específica y vuelve a levantar el
  servicio (`docker compose pull && docker compose up -d`).
- Revisa las notas de la versión oficial antes de migrar; las carpetas `pb_migrations` y
  `pb_public` te ayudan a mantener scripts y assets sincronizados con la instancia.
