Eres un arquitecto y desarrollador senior full-stack. Construye una aplicación web profesional, mobile-first y ultra rápida para gestionar ingresos en ceremonias de grado con QR.  

Requisitos:
1. Cargar CSV con estudiantes e invitados (máx 2 invitados por estudiante).
2. Generar tickets únicos con QR para cada invitado y estudiante.
3. Diseñador de tarjetas: subir plantilla HTML/CSS o PNG, elegir fuentes, posicionar QR, vista previa.
4. Descargar tarjetas (PDF/PNG/ZIP) individual o por lote.
5. Módulo de control de acceso: escaneo QR rápido con cámara, búsqueda manual (ID estudiante, nombre, documento), marcar ingreso sin duplicados.
6. Reportes descargables por ceremonia (CSV/PDF) con ingresos, pendientes y duplicados evitados.
7. Interfaz web intuitiva, mobile-first, usable desde celular.
8. Stack: Next.js + React + TypeScript + TailwindCSS (frontend), Firebase Firestore + Cloud Functions + Storage (backend).
9. QR con @zxing/browser (lectura) y qrcode (generación).
10. Rendimiento: escaneo <150ms, soporte offline con sincronización y reintentos.

Entrega:
- Estructura completa del proyecto (frontend y backend).
- Módulos y componentes clave listos (CSV uploader, QR generator, QR scanner, template designer, reports).
- Comentarios y buenas prácticas en el código.
