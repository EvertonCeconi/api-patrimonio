export type RowAction =
  | { action: 'create' }
  | { action: 'update'; record: { id: string } }
  | { action: 'skip'; record: { id: string } }
  | { action: 'error'; message: string };

export interface RowSummary {
  row: number;
  action: 'create' | 'update' | 'skip' | 'error';
  message?: string;
}

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

export interface ImportPreviewResult {
  token: string;
  total: number;
  toCreate: number;
  toUpdate: number;
  toSkip: number;
  errors: { row: number; message: string }[];
  rows: RowSummary[];
}
