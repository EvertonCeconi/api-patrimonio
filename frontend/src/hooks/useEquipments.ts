import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipmentService } from '@/services/equipment.service';
import type { EquipmentFilters, EquipmentPayload } from '@/types';

export const EQUIPMENT_KEYS = {
  all: ['equipments'] as const,
  list: (filters: EquipmentFilters) => ['equipments', 'list', filters] as const,
  detail: (id: string) => ['equipments', 'detail', id] as const,
};

export function useEquipments(filters: EquipmentFilters = {}) {
  return useQuery({
    queryKey: EQUIPMENT_KEYS.list(filters),
    queryFn: () => equipmentService.list(filters),
  });
}

export function useEquipment(id: string) {
  return useQuery({
    queryKey: EQUIPMENT_KEYS.detail(id),
    queryFn: () => equipmentService.getById(id),
    enabled: !!id,
  });
}

export function useEquipmentSuggestions() {
  return useQuery({
    queryKey: ['equipments', 'suggestions'],
    queryFn: () => equipmentService.suggestions(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EquipmentPayload) => equipmentService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEYS.all });
    },
  });
}

export function useUpdateEquipment(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<EquipmentPayload>) =>
      equipmentService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEYS.all });
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => equipmentService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEYS.all });
    },
  });
}

export function useExportEquipmentsCsv() {
  return useMutation({
    mutationFn: (filters: EquipmentFilters) => equipmentService.exportCsv(filters),
  });
}

export function useExportEquipmentsXlsx() {
  return useMutation({
    mutationFn: (filters: EquipmentFilters) => equipmentService.exportXlsx(filters),
  });
}

export function useImportPreview() {
  return useMutation({
    mutationFn: ({ file, mode }: { file: File; mode: 'upsert' | 'insert' }) =>
      equipmentService.importPreview(file, mode),
  });
}

export function useImportConfirm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (token: string) => equipmentService.importConfirm(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EQUIPMENT_KEYS.all });
    },
  });
}
