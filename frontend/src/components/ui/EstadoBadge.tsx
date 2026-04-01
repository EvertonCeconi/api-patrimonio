import type { Estado } from '@/types';

const config: Record<Estado, { label: string; className: string }> = {
  ESTOQUE:    { label: 'Estoque',    className: 'bg-emerald-50 text-emerald-700' },
  CLIENTE:     { label: 'Cliente',     className: 'bg-blue-50 text-blue-700' },
  MANUTENCAO: { label: 'Manutenção', className: 'bg-amber-50 text-amber-700' },
  RETIRADA_PECAS: { label: 'Retirada de peças', className: 'bg-surface-100 text-surface-500' },
};

export function EstadoBadge({ status }: { status: Estado }) {
  const { label, className } = config[status] ?? config.ESTOQUE;
  return <span className={`badge ${className}`}>{label}</span>;
}
