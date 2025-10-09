import Papa from 'papaparse';
import { CABECERA_CEREMONIAS, CeremoniaCsvRow, CeremoniaCsvSchema } from '@/types/ceremonia-import';

const normalizar = (encabezado: string) => {
  const sinBom = encabezado.replace(/^\ufeff/, '').trim();
  if (sinBom.startsWith('"') && sinBom.endsWith('"')) {
    return sinBom.slice(1, -1).trim();
  }
  return sinBom;
};

const detectarDelimitador = (linea: string) => {
  const candidatos = [',', ';', '\t', '|'] as const;
  for (const candidato of candidatos) {
    const columnas = linea.split(candidato).map(normalizar);
    if (columnas.length === CABECERA_CEREMONIAS.length) {
      return { delimitador: candidato, columnas };
    }
  }

  const columnasPorDefecto = linea.split(',').map(normalizar);
  const delimitador = columnasPorDefecto.length > 1 ? ',' : undefined;
  return { delimitador, columnas: columnasPorDefecto };
};

export const parsearCsvCeremoniasProtegidas = async (archivo: File): Promise<CeremoniaCsvRow[]> => {
  const texto = await archivo.text();
  let delimitadorDetectado: string | undefined;

  const [lineaEncabezado] = texto.split(/\r?\n/, 1);
  if (lineaEncabezado) {
    const { delimitador, columnas } = detectarDelimitador(lineaEncabezado);
    delimitadorDetectado = delimitador;
    const longitudValida = columnas.length === CABECERA_CEREMONIAS.length;
    const ordenValido = columnas.every((columna, indice) => columna === CABECERA_CEREMONIAS[indice]);
    if (!longitudValida || !ordenValido) {
      throw new Error('Encabezados invalidos. Se esperaba: ' + CABECERA_CEREMONIAS.join(', '));
    }
  }

  const { data, errors } = Papa.parse<Record<string, string | undefined>>(texto, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizar,
    transform: (valor) => (valor ?? '').trim(),
    delimiter: delimitadorDetectado,
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
