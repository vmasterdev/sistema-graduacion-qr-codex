import Papa from 'papaparse';
import { z } from 'zod';
import { CsvStudentRow } from '@/types';

const CsvRowSchema = z.object({
  idEstudiante: z.string().min(1, 'ID de estudiante requerido'),
  nombreCompleto: z.string().min(1, 'Nombre completo requerido'),
  numeroDocumento: z.string().min(1, 'Número de documento requerido'),
  programa: z.string().min(1, 'Programa requerido'),
  idCeremonia: z.string().min(1, 'ID de ceremonia requerido'),
  fechaCeremonia: z.string().min(1, 'Fecha de ceremonia requerida'),
  municipio: z.string().min(1, 'Municipio requerido'),
  nombreInvitadoUno: z.string().optional(),
  documentoInvitadoUno: z.string().optional(),
  nombreInvitadoDos: z.string().optional(),
  documentoInvitadoDos: z.string().optional(),
});

const expectedHeaders = [
  'idEstudiante',
  'nombreCompleto',
  'numeroDocumento',
  'idCeremonia',
  'fechaCeremonia',
  'municipio',
  'nombreInvitadoUno',
  'documentoInvitadoUno',
  'nombreInvitadoDos',
  'documentoInvitadoDos',
  'programa',
] as const;

const normaliseHeader = (header: string) => header.replace(/^\ufeff/, '').trim();

export const parseStudentsCsv = async (file: File): Promise<CsvStudentRow[]> => {
  const text = await file.text();

  const [rawHeaderLine] = text.split(/\r?\n/, 1);
  if (rawHeaderLine) {
    const headerColumns = rawHeaderLine.split(',').map((header) => normaliseHeader(header));
    if (
      headerColumns.length !== expectedHeaders.length ||
      headerColumns.some((header, index) => header !== expectedHeaders[index])
    ) {
      throw new Error('Encabezados del CSV inválidos. Usa la plantilla oficial.');
    }
  }

  const { data, errors } = Papa.parse<Record<string, string | undefined>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => normaliseHeader(header),
    transform: (value) => (value ?? '').trim(),
  });

  if (errors.length) {
    throw new Error(`Errores en CSV: ${errors.map((e) => e.message).join(', ')}`);
  }

  const parsedRows: CsvStudentRow[] = [];
  data.forEach((row, index) => {
    const result = CsvRowSchema.safeParse(row);
    if (!result.success) {
      const issues = result.error.issues.map((issue) => issue.message).join(', ');
      throw new Error(`Fila ${index + 2}: ${issues}`);
    }
    parsedRows.push(result.data);
  });

  return parsedRows;
};
