export function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
        role === 'ADMIN'
          ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
          : 'bg-surface-100 text-surface-600 ring-1 ring-surface-200'
      }`}
    >
      {role}
    </span>
  );
}

export function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${
        isActive
          ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
          : 'bg-red-50 text-red-600 ring-1 ring-red-200'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-400'}`} />
      {isActive ? 'Ativo' : 'Inativo'}
    </span>
  );
}
