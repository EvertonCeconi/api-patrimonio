import { useState, useCallback } from 'react';
import { useEquipments, useCreateEquipment, useUpdateEquipment, useDeleteEquipment, useEquipmentSuggestions } from '@/hooks/useEquipments';
import { useAuthStore } from '@/store/auth.store';
import { EstadoBadge } from '@/components/ui/EstadoBadge';
import { Pagination } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import { Autocomplete } from '@/components/ui/Autocomplete';
import { EquipmentForm } from '@/components/equipments/EquipmentForm';
import { EquipmentImportExport } from '@/components/equipments/EquipmentImportExport';
import type { Equipment, EquipmentFilters, EquipmentPayload, Estado } from '@/types';

const ESTADOS_FILTER: { value: Estado | ''; label: string }[] = [
  { value: '',           label: 'Todos os estados' },
  { value: 'ESTOQUE',    label: 'Estoque' },
  { value: 'CLIENTE',     label: 'Cliente' },
  { value: 'MANUTENCAO', label: 'Manutenção' },
  { value: 'RETIRADA_PECAS', label: 'Retirada de peças' },
];

export function EquipmentsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const [filters, setFilters] = useState<EquipmentFilters>({ page: 1 });
  const [search, setSearch] = useState('');

  // Filtros específicos por coluna (independentes da busca geral)
  const [columnFilters, setColumnFilters] = useState({
    name: '',
    model: '',
    serialNumber: '',
    ipAddress: '',
    location: '',
  });

  const hasColumnFilters = Object.values(columnFilters).some((v) => v.trim() !== '');
  const [appliedFilters, setAppliedFilters] = useState<EquipmentFilters>({});

  function applyColumnFilters() {
    const clean: EquipmentFilters = {};
    for (const key of Object.keys(columnFilters) as (keyof typeof columnFilters)[]) {
      const value = columnFilters[key].trim();
      if (value) clean[key] = value;
    }
    setAppliedFilters(clean);
    // remove filtros de coluna antigos (que foram limpos no input)
    // preservando busca geral (search) e status
    setFilters((f) => {
      const rest: EquipmentFilters = { ...f };
      delete rest.name;
      delete rest.model;
      delete rest.serialNumber;
      delete rest.ipAddress;
      delete rest.location;
      return { ...rest, page: 1, ...clean };
    });
  }

  function clearColumnFilters() {
    setColumnFilters({ name: '', model: '', serialNumber: '', ipAddress: '', location: '' });
    setAppliedFilters({});
    setFilters((f) => {
      const rest: EquipmentFilters = { page: 1 };
      // preserva search e status existentes
      if (f.status) rest.status = f.status;
      if (f.search) rest.search = f.search;
      return rest;
    });
  }

  const { data, isLoading, isError } = useEquipments(filters);

  // Sugestões de autocomplete vindas do banco (GET /equipments/suggestions)
  const { data: suggestions } = useEquipmentSuggestions();

  const createMutation  = useCreateEquipment();
  const deleteMutation  = useDeleteEquipment();

  // Modal state
  const [createOpen, setCreateOpen]          = useState(false);
  const [editTarget, setEditTarget]          = useState<Equipment | null>(null);
  const [deleteTarget, setDeleteTarget]      = useState<Equipment | null>(null);
  const [importExportOpen, setImportExportOpen] = useState(false);

  const updateMutation = useUpdateEquipment(editTarget?.id ?? '');

  // Search com debounce simples via onBlur / Enter
  function applySearch() {
    setFilters((f) => ({ ...f, page: 1, search: search || undefined }));
  }

  const handleFilterEstado = useCallback((status: string) => {
    setFilters((f) => ({ ...f, page: 1, status: (status as Estado) || undefined }));
  }, []);

  async function handleCreate(payload: EquipmentPayload) {
    await createMutation.mutateAsync(payload);
    setCreateOpen(false);
  }

  async function handleEdit(payload: EquipmentPayload) {
    await updateMutation.mutateAsync(payload);
    setEditTarget(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-surface-900">Equipamentos</h1>
          <p className="text-sm text-surface-600 mt-0.5">
            {data?.meta.total ?? '–'} equipamento{data?.meta.total !== 1 ? 's' : ''} cadastrado{data?.meta.total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setImportExportOpen(true)} className="btn-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            {isAdmin ? 'Exportar / Importar' : 'Exportar'}
          </button>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo equipamento
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 my-3">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-600"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="input pl-9"
            placeholder="Buscar por nome, modelo, patrimônio…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            onBlur={applySearch}
          />
        </div>
        <select
          className="input w-48"
          onChange={(e) => handleFilterEstado(e.target.value)}
        >
          {ESTADOS_FILTER.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Filtros específicos por coluna */}
      <div className="mb-3 rounded-lg border border-surface-100 bg-white p-3">
        <div className="flex flex-wrap gap-3">
          {(
            [
              ['name', 'Nome'],
              ['model', 'Modelo'],
              ['ipAddress', 'IP'],
              ['location', 'Localização'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex-1 min-w-[140px]">
              <Autocomplete
                label={label}
                value={columnFilters[key]}
                options={suggestions?.[key]}
                onChange={(v) => setColumnFilters((cf) => ({ ...cf, [key]: v }))}
                onBlur={applyColumnFilters}
                onSelect={applyColumnFilters}
                onEnter={applyColumnFilters}
                placeholder={`Filtrar por ${label.toLowerCase()}`}
              />
            </div>
          ))}
          <div className="flex-1 min-w-[140px]">
            <label className="label">
              Nº de série
            </label>
            <input
              className="input"
              placeholder="Filtrar por nº de série"
              value={columnFilters.serialNumber}
              onChange={(e) =>
                setColumnFilters((cf) => ({ ...cf, serialNumber: e.target.value }))
              }
              onKeyDown={(e) => e.key === 'Enter' && applyColumnFilters()}
              onBlur={applyColumnFilters}
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={applyColumnFilters}
              className="btn-primary"
              title="Aplicar filtros específicos"
            >
              Aplicar
            </button>
            <button
              onClick={clearColumnFilters}
              className="btn-secondary"
              disabled={!hasColumnFilters && !Object.keys(appliedFilters).length}
              title="Limpar filtros específicos (mantém a busca geral)"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden overflow-x-auto">
        {isLoading ? (
          <div className="p-12 text-center text-surface-600 text-sm">Carregando…</div>
        ) : isError ? (
          <div className="p-12 text-center text-red-500 text-sm">Erro ao carregar equipamentos.</div>
        ) : data?.data.length === 0 ? (
          <div className="p-12 text-center text-surface-600 text-sm">
            Nenhum equipamento encontrado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-100 bg-surface-50">
                <th className="text-left px-4 py-3 font-medium text-surface-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-surface-600">Modelo</th>
                <th className="text-left px-4 py-3 font-medium text-surface-600">Número de série</th>
                <th className="text-left px-4 py-3 font-medium text-surface-600">IP</th>
                <th className="text-left px-4 py-3 font-medium text-surface-600">Localização</th>
                <th className="text-left px-4 py-3 font-medium text-surface-600">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {data?.data.map((eq) => (
                <tr key={eq.id} className="hover:bg-surface-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-surface-900 max-w-[180px] truncate" title={eq.name}>{eq.name}</td>
                  <td className="px-4 py-3 text-surface-600 max-w-[160px] truncate" title={eq.model}>{eq.model}</td>
                  <td className="px-4 py-3 text-surface-600 max-w-[120px] truncate" title={eq.serialNumber}>{eq.serialNumber}</td>
                  <td className="px-4 py-3 font-mono text-xs text-surface-600" title={eq.ipAddress ?? ''}>
                    {eq.ipAddress ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-surface-600 max-w-[180px] truncate" title={eq.location}>{eq.location}</td>
                  <td className="px-4 py-3">
                    <EstadoBadge status={eq.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditTarget(eq)}
                        className="btn-ghost p-1.5 text-surface-600"
                        title="Editar"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeleteTarget(eq)}
                          className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"
                          title="Excluir"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data?.meta && (
        <Pagination
          meta={data.meta}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
        />
      )}

      {/* Modal — Criar */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Novo equipamento" width="max-w-xl">
        <EquipmentForm
          suggestions={suggestions}
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          loading={createMutation.isPending}
        />
      </Modal>

      {/* Modal — Editar */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar equipamento" width="max-w-xl">
        {editTarget && (
          <EquipmentForm
            initial={editTarget}
            suggestions={suggestions}
            onSubmit={handleEdit}
            onCancel={() => setEditTarget(null)}
            loading={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* Modal — Confirmar exclusão */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Excluir equipamento" width="max-w-sm">
        <div className="space-y-4">
          <p className="text-sm text-surface-600">
            Tem certeza que deseja excluir{' '}
            <span className="font-medium text-surface-900">{deleteTarget?.name}</span>?
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="btn-danger flex-1"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Excluindo…' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal — Exportar / Importar */}
      <EquipmentImportExport
        open={importExportOpen}
        onClose={() => setImportExportOpen(false)}
        filters={filters}
      />
    </div>
  );
}
