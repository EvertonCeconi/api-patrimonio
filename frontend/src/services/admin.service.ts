import { api } from '@/lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UsersResponse {
  data: User[];
  meta: PaginationMeta;
  message?: string;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  role?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'USER';
  isActive?: boolean;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  password?: string;
  currentPassword?: string;
  role?: 'ADMIN' | 'USER';
  isActive?: boolean;
}

export const adminService = {
  async getUsers(params: GetUsersParams): Promise<UsersResponse> {
    const { data } = await api.get<UsersResponse>('/admin/users', { params });
    return data;
  },

  async getUserById(id: string): Promise<User> {
    const { data } = await api.get<User>(`/admin/users/${id}`);
    return data;
  },

  async createUser(payload: CreateUserPayload): Promise<User> {
    const { data } = await api.post<User>('/admin/users', payload);
    return data;
  },

  async updateUser(id: string, payload: UpdateUserPayload): Promise<User> {
    const { data } = await api.patch<User>(`/admin/users/${id}`, payload);
    return data;
  },

  async activateUser(id: string): Promise<User> {
    const { data } = await api.patch<User>(`/admin/users/${id}/activate`);
    return data;
  },

  async promoteUser(id: string): Promise<User> {
    const { data } = await api.patch<User>(`/admin/users/${id}/promote`);
    return data;
  },

  async deleteUser(id: string): Promise<{ message: string }> {
    const { data } = await api.delete<{ message: string }>(`/admin/users/${id}`);
    return data;
  },
};
