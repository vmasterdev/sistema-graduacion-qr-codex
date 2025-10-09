import Papa from 'papaparse';
import { CABECERA_CEREMONIAS, CeremoniaCsvRow, CeremoniaCsvSchema } from '@/types/ceremonia-import';

const normalizar = (encabezado: string) => encabezado.replace(/^\ufeff/, '').trim();

export const parsearCsvCeremoniasProtegidas = async (archivo: File): Promise<CeremoniaCsvRow[]> => {
  const texto = await archivo.text();
  const [lineaEncabezado] = texto.split(/\r?\n/, 1);
  if (lineaEncabezado) {
    const columnas = lineaEncabezado.split(',').map(normalizar);
    const longitudValida = columnas.length === CABECERA_CEREMONIAS.length;
    const ordenValido = columnas.every((columna, indice) => columna === CABECERA_CEREMONIAS[indice]);
    if (!longitudValida || !ordenValido) {
      throw new Error('Encabezados inválidos. Se esperaba: ' + CABECERA_CEREMONIAS.join(', '));
    }
  }

  const { data, errors } = Papa.parse<Record<string, string | undefined>>(texto, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizar,
    transform: (valor) => (valor ?? '').trim(),
  });

  if (errors.length) {
    throw new Error('Errores en CSV: ' + errors.map((e) => e.message).join(', '));
  }

  return data.map((fila, indice) => {
    const resultado = CeremoniaCsvSchema.safeParse(fila);
    if (!resultado.success) {
      const errores = resultado.error.issues.map((issue) => issue.message).join(', ');
      throw new Error('Fila ' + (indice + 2) + ': ' + errores);
    }
    return resultado.data;
  });
};
