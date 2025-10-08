import Papa from 'papaparse';
import { z } from 'zod';
import { CsvStudentRow } from '@/types';

const CsvRowSchema = z.object({
  studentId: z.string().min(1, 'ID estudiante requerido'),
  fullName: z.string().min(1, 'Nombre requerido'),
  documentNumber: z.string().min(1, 'Documento requerido'),
  ceremonyId: z.string().min(1, 'Ceremonia requerida'),
  guestOneName: z.string().optional(),
  guestOneDocument: z.string().optional(),
  guestTwoName: z.string().optional(),
  guestTwoDocument: z.string().optional(),
});

export const parseStudentsCsv = async (file: File): Promise<CsvStudentRow[]> => {
  const text = await file.text();

  const { data, errors } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
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
