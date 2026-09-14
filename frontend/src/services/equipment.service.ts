import { api } from '@/lib/api';
import type {
  Equipment,
  EquipmentFilters,
  EquipmentPayload,
  EquipmentSuggestions,
  ImportPreviewResult,
  ImportResult,
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

  async suggestions(): Promise<EquipmentSuggestions> {
    const { data } = await api.get<EquipmentSuggestions>('/equipments/suggestions');
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

  async exportCsv(filters: EquipmentFilters = {}): Promise<Blob> {
    const { data } = await api.get<Blob>('/equipments/export/csv', {
      params: filters,
      responseType: 'blob',
    });
    return data;
  },

  async exportXlsx(filters: EquipmentFilters = {}): Promise<Blob> {
    const { data } = await api.get<Blob>('/equipments/export/xlsx', {
      params: filters,
      responseType: 'blob',
    });
    return data;
  },

  async importPreview(file: File, mode: 'upsert' | 'insert' = 'upsert'): Promise<ImportPreviewResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', mode);
    const { data } = await api.post<ImportPreviewResult>('/equipments/import/preview', formData);
    return data;
  },

  async importConfirm(token: string): Promise<ImportResult> {
    const { data } = await api.post<ImportResult>('/equipments/import/confirm', { token });
    return data;
  },
};
