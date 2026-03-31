import { api } from '@/lib/api';
import type {
  Equipment,
  EquipmentFilters,
  EquipmentPayload,
  PaginatedResponse,
} from '@/types';

export const equipmentService = {
  async list(filters: EquipmentFilters = {}): Promise<PaginatedResponse<Equipment>> {
    const { data } = await api.get<PaginatedResponse<Equipment>>('/equipments', {
      params: filters,
    });
    return data;
  },

  async getById(id: string): Promise<Equipment> {
    const { data } = await api.get<Equipment>(`/equipments/${id}`);
    return data;
  },

  async create(payload: EquipmentPayload): Promise<Equipment> {
    const { data } = await api.post<Equipment>('/equipments', payload);
    return data;
  },

  async update(id: string, payload: Partial<EquipmentPayload>): Promise<Equipment> {
    const { data } = await api.patch<Equipment>(`/equipments/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/equipments/${id}`);
  },
};
