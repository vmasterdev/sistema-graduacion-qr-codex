import Papa from 'papaparse';
import { z } from 'zod';
import { CsvStudentRow } from '@/types';

const CsvRowSchema = z.object({
  studentId: z.string().min(1, 'ID estudiante requerido'),
  fullName: z.string().min(1, 'Nombre requerido'),
  documentNumber: z.string().min(1, 'Documento requerido'),
  programName: z.string().min(1, 'Programa requerido'),
  ceremonyId: z.string().min(1, 'Ceremonia requerida'),
  guestOneName: z.string().optional(),
  guestOneDocument: z.string().optional(),
  guestTwoName: z.string().optional(),
  guestTwoDocument: z.string().optional(),
});

const expectedHeaders = [
  'studentId',
  'fullName',
  'documentNumber',
  'programName',
  'ceremonyId',
  'guestOneName',
  'guestOneDocument',
  'guestTwoName',
  'guestTwoDocument',
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
