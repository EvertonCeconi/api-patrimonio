// ─── Auth ────────────────────────────────────────────────────────────────────

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignUpPayload {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  role: Role;
}

// ─── Equipment ───────────────────────────────────────────────────────────────

export type Estado =
  | 'ESTOQUE'
  | 'CLIENTE'
  | 'MANUTENCAO'
  | 'RETIRADA_PECAS';

export interface Equipment {
  id: string;
  name: string;
  location: string;
  model: string;
  assetTag?: string;
  serialNumber?: string;
  ipAddress?: string;
  description?: string;
  status: Estado;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentPayload {
  name: string;
  location: string;
  model: string;
  assetTag?: string;
  serialNumber?: string;
  ipAddress?: string;
  description?: string;
  status?: Estado;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  message?: string;
}

export interface EquipmentFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: Estado;
}

export interface ApiError {
  field: string;
  code: string;
}

export interface ApiErrorResponse {
  errors?: ApiError[];
  message?: string;
  statusCode?: number;
  error?: string;
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
  rows: { row: number; action: 'create' | 'update' | 'skip' | 'error'; message?: string }[];
}
