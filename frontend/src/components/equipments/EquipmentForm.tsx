import { useState } from 'react';
import type { ApiErrorResponse, Equipment, EquipmentPayload, Estado } from '@/types';
import { translateConflict, translateError } from '@/lib/translateError';
import axios from 'axios';

const ESTADOS: { value: Estado; label: string }[] = [
  { value: 'ESTOQUE',    label: 'Estoque' },
  { value: 'CLIENTE',     label: 'Cliente' },
  { value: 'MANUTENCAO', label: 'Manutenção' },
  { value: 'RETIRADA_PECAS', label: 'Retirada de peças' },
];

interface EquipmentFormProps {
  initial?: Partial<Equipment>;
  onSubmit: (data: EquipmentPayload) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function EquipmentForm({ initial, onSubmit, onCancel, loading }: EquipmentFormProps) {
  const [form, setForm] = useState<EquipmentPayload>({
    name:initial?.name ?? '',
    location:initial?.location ?? '',
    model:initial?.model ?? '',
    
    serialNumber:initial?.serialNumber ?? '',
    ipAddress:initial?.ipAddress ?? '',
    description:initial?.description ?? '',
    status:initial?.status ?? 'ESTOQUE',
  });

  const [error, setError] = useState('');

  function set(field: keyof EquipmentPayload, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
    ) as EquipmentPayload;

    try {
      await onSubmit(payload);
    }catch (err: unknown) {
      if (axios.isAxiosError<ApiErrorResponse>(err)) {
        const status = err.response?.status;
        const data = err.response?.data;

        if (status === 409) {
          setError(translateConflict(data?.message ?? ''));
          return;
        }

        if (status === 400 && data?.errors) {
          const messages = data.errors.map((e) => translateError(e));
          setError(messages.join(', '));
          return;
        }
      }

      setError('Erro ao salvar equipamento.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Nome *</label>
          <input className="input w-full" value={form.name}
            onChange={(e) => set('name', e.target.value)} required placeholder="Ex: Impressora HP" />
        </div>

        <div>
          <label className="label">Número de série</label>
          <input className="input w-full" value={form.serialNumber}
            onChange={(e) => set('serialNumber', e.target.value)} required placeholder="Ex: 948347" />
        </div>

        <div>
          <label className="label">Modelo *</label>
          <input className="input w-full" value={form.model}
            onChange={(e) => set('model', e.target.value)} required placeholder="Ex: 3710SF" />
        </div>

        <div>
          <label className="label">Localização *</label>
          <input className="input w-full" value={form.location}
            onChange={(e) => set('location', e.target.value)} required placeholder="Ex: Matriz" />
        </div>

        <div>
          <label className="label">IP</label>
          <input className="input w-full" value={form.ipAddress}
            onChange={(e) => set('ipAddress', e.target.value)} placeholder="Ex: 192.168.0.1" />
        </div>

        <div>
          <label className="label">Estado</label>
          <select className="input w-full" value={form.status}
            onChange={(e) => set('status', e.target.value as Estado)}>
            {ESTADOS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Descrição</label>
        <textarea className="input w-full resize-none text-base" rows={3} value={form.description}
          onChange={(e) => set('description', e.target.value)} placeholder="Descrição..." />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
      )}

      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Cancelar
        </button>
        <button type="submit" className="btn-primary flex-1" disabled={loading}>
          {loading ? 'Salvando…' : initial?.id ? 'Salvar alterações' : 'Criar equipamento'}
        </button>
      </div>
    </form>
  );
}
