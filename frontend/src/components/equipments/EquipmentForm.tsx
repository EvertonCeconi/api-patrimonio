import { useState } from 'react';
import type { Equipment, EquipmentPayload, Estado } from '@/types';

const ESTADOS: { value: Estado; label: string }[] = [
  { value: 'ESTOQUE',    label: 'Estoque' },
  { value: 'EM_USO',     label: 'Em uso' },
  { value: 'MANUTENCAO', label: 'Manutenção' },
  { value: 'DESCARTADO', label: 'Descartado' },
];

interface EquipmentFormProps {
  initial?: Partial<Equipment>;
  onSubmit: (data: EquipmentPayload) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function EquipmentForm({ initial, onSubmit, onCancel, loading }: EquipmentFormProps) {
  const [form, setForm] = useState<EquipmentPayload>({
    nome:        initial?.nome        ?? '',
    localizacao: initial?.localizacao ?? '',
    modelo:      initial?.modelo      ?? '',
    patrimonio:  initial?.patrimonio  ?? '',
    numeroSerie: initial?.numeroSerie ?? '',
    ip:          initial?.ip          ?? '',
    descricao:   initial?.descricao   ?? '',
    estado:      initial?.estado      ?? 'ESTOQUE',
  });

  const [error, setError] = useState('');

  function set(field: keyof EquipmentPayload, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // remove campos opcionais vazios antes de enviar
    const payload = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== ''),
    ) as EquipmentPayload;

    try {
      await onSubmit(payload);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) setError('Patrimônio já cadastrado.');
      else if (status === 400) setError('Verifique os campos e tente novamente.');
      else setError('Erro ao salvar equipamento.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Nome *</label>
          <input className="input" value={form.nome}
            onChange={(e) => set('nome', e.target.value)} required placeholder="Ex: Notebook Dell" />
        </div>

        <div>
          <label className="label">Modelo *</label>
          <input className="input" value={form.modelo}
            onChange={(e) => set('modelo', e.target.value)} required placeholder="Ex: Latitude 5420" />
        </div>

        <div>
          <label className="label">Estado</label>
          <select className="input" value={form.estado}
            onChange={(e) => set('estado', e.target.value as Estado)}>
            {ESTADOS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="label">Localização *</label>
          <input className="input" value={form.localizacao}
            onChange={(e) => set('localizacao', e.target.value)} required placeholder="Ex: Sala 301" />
        </div>

        <div>
          <label className="label">Patrimônio</label>
          <input className="input" value={form.patrimonio}
            onChange={(e) => set('patrimonio', e.target.value)} placeholder="Ex: PAT-001" />
        </div>

        <div>
          <label className="label">Número de série</label>
          <input className="input" value={form.numeroSerie}
            onChange={(e) => set('numeroSerie', e.target.value)} placeholder="Ex: SN-12345" />
        </div>

        <div>
          <label className="label">IP</label>
          <input className="input" value={form.ip}
            onChange={(e) => set('ip', e.target.value)} placeholder="Ex: 192.168.0.1" />
        </div>

        <div className="col-span-2">
          <label className="label">Descrição</label>
          <textarea className="input resize-none" rows={2} value={form.descricao}
            onChange={(e) => set('descricao', e.target.value)} placeholder="Observações..." />
        </div>
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
