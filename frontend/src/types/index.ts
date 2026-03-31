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
  | 'EM_USO'
  | 'MANUTENCAO'
  | 'DESCARTADO';

export interface Equipment {
  id: string;
  nome: string;
  localizacao: string;
  modelo: string;
  patrimonio?: string;
  numeroSerie?: string;
  ip?: string;
  descricao?: string;
  estado: Estado;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentPayload {
  nome: string;
  localizacao: string;
  modelo: string;
  patrimonio?: string;
  numeroSerie?: string;
  ip?: string;
  descricao?: string;
  estado?: Estado;
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
  estado?: Estado;
}
