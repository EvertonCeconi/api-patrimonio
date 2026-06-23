import { translateError } from './translateError';

interface ApiFieldError {
  field: string;
  code: string;
}

function isObjectWithKeys(value: unknown, keys: string[]): boolean {
  return typeof value === 'object' && value !== null && keys.every((k) => k in value);
}

export function extractApiError(err: unknown): string {
  if (!err || typeof err !== 'object' || !('response' in err)) {
    return 'Erro inesperado. Tente novamente.';
  }

  const data = (err as { response?: { data?: unknown } }).response?.data;

  if (!data || typeof data !== 'object') {
    return 'Erro inesperado. Tente novamente.';
  }

  if (isObjectWithKeys(data, ['errors']) && Array.isArray((data as Record<string, unknown>).errors)) {
    const fieldErrors = (data as { errors: ApiFieldError[] }).errors;
    return fieldErrors.map(translateError).join(', ');
  }

  if ('message' in data) {
    const msg = (data as { message: string | string[] }).message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  }

  return 'Erro inesperado. Tente novamente.';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCsv(blob: Blob): void {
  downloadBlob(blob, 'equipamentos.csv');
}

export function downloadXlsx(blob: Blob): void {
  downloadBlob(blob, 'equipamentos.xlsx');
}
