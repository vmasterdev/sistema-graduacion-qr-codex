import { z } from 'zod';

/**
 * Esquema de las ceremonias admitidas en la carga masiva protegida.
 * Se usa tanto en el frontend (validacion previa) como en el backend.
 */
export const CeremoniaCsvSchema = z.object({
  id_ceremonia: z.string().min(1, 'id_ceremonia requerido'),
  nombre_ceremonia: z.string().min(1, 'nombre_ceremonia requerido'),
  fecha_ceremonia: z.string().min(1, 'fecha_ceremonia requerida'),
  lugar_ceremonia: z.string().min(1, 'lugar_ceremonia requerido'),
  descripcion: z.string().optional(),
});

export type CeremoniaCsvRow = z.infer<typeof CeremoniaCsvSchema>;

export const CABECERA_CEREMONIAS: Array<keyof CeremoniaCsvRow> = [
  'id_ceremonia',
  'nombre_ceremonia',
  'fecha_ceremonia',
  'lugar_ceremonia',
  'descripcion',
];
